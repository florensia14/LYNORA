
const db = require("../config/database");
const midtransConfig = require("../config/midtrans");
const crypto = require("crypto");

const {
  verifyMidtransSignature,
} = require("../utils/midtransSignature");

const {
  mapMidtransError,
  toRupiahInteger,
} = require("../utils/midtransHelpers");

function safeLogValue(value, maxLength = 40) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  return String(value).slice(0, maxLength);
}

function generateTicketCode(orderItemId) {
  return `LYN-${orderItemId}-${crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase()}`;
}

function generateQrToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isAmountValid(grossAmount, expectedAmount) {
  const notified = toRupiahInteger(grossAmount);
  const expected = toRupiahInteger(expectedAmount);

  return (
    notified !== null &&
    expected !== null &&
    Number.isSafeInteger(notified) &&
    Number.isSafeInteger(expected) &&
    notified === expected
  );
}

function mapTransactionStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case "settlement":
      return {
        paymentStatus: "success",
        orderStatus: "paid",
      };

    case "capture":
      if (fraudStatus === "accept") {
        return {
          paymentStatus: "success",
          orderStatus: "paid",
        };
      }

      return {
        paymentStatus: "pending",
        orderStatus: "pending",
      };

    case "pending":
      return {
        paymentStatus: "pending",
        orderStatus: "pending",
      };

    case "expire":
      return {
        paymentStatus: "expired",
        orderStatus: "expired",
      };

    case "deny":
      return {
        paymentStatus: "failed",
        orderStatus: "cancelled",
      };

    case "cancel":
      return {
        paymentStatus: "cancelled",
        orderStatus: "cancelled",
      };

    case "refund":
      return {
        paymentStatus: "refunded",
        orderStatus: "refunded",
      };

    default:
      return null;
  }
}

async function issueTickets(connection, orderId) {
  const [items] = await connection.execute(
    `SELECT id, quantity
     FROM order_items
     WHERE order_id = ?
     ORDER BY id`,
    [orderId]
  );

  if (!items.length) {
    throw new Error("Order tidak memiliki item tiket");
  }

  let totalIssued = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error(`Quantity tidak valid pada order item ${item.id}`);
    }

    const [ticketRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM tickets
       WHERE order_item_id = ?`,
      [item.id]
    );

    const existingCount = Number(ticketRows[0]?.total || 0);

    if (existingCount > quantity) {
      throw new Error(`Jumlah tiket melebihi quantity order item ${item.id}`);
    }

    const missingCount = quantity - existingCount;

    for (let i = 0; i < missingCount; i++) {
      await connection.execute(
        `INSERT INTO tickets (
           order_item_id,
           ticket_code,
           qr_token,
           status,
           issued_at
         )
         VALUES (?, ?, ?, 'valid', NOW())`,
        [
          item.id,
          generateTicketCode(item.id),
          generateQrToken(),
        ]
      );

      totalIssued++;
    }
  }

  return totalIssued;
}

async function handleMidtransWebhook(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    // 1. Periksa konfigurasi Midtrans.
    const configuration = midtransConfig.validateConfiguration();

    if (!configuration.ready) {
      console.error("[midtrans-webhook] Configuration is not ready");

      return res.status(503).json({
        message: "Konfigurasi Midtrans belum siap",
      });
    }

    // 2. Verifikasi signature notifikasi.
    const signature = verifyMidtransSignature(
      req.body,
      midtransConfig.getServerKey()
    );

    if (!signature.valid) {
      console.warn("[midtrans-webhook] Invalid signature", {
        reason: signature.reason,
        order_id: safeLogValue(req.body?.order_id),
      });

      return res.status(401).json({
        message: "Signature notifikasi tidak valid",
      });
    }

    // 3. Ambil status terbaru langsung dari Midtrans.
    let statusResponse;

    try {
      statusResponse = await midtransConfig
        .getCoreApi()
        .transaction.notification(req.body);
    } catch (error) {
      const mapped = mapMidtransError(error);

      console.error(
        `[midtrans-webhook] Status verification error (${mapped.code}):`,
        mapped.logDetail
      );

      return res.status(mapped.status).json({
        message: "Gagal memverifikasi status pembayaran",
      });
    }

    if (!statusResponse) {
      return res.status(400).json({
        message: "Respons transaksi Midtrans kosong",
      });
    }

    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      gross_amount,
      currency,
      transaction_time,
    } = statusResponse;

    if (
      !order_id ||
      !transaction_id ||
      gross_amount === undefined ||
      gross_amount === null
    ) {
      return res.status(400).json({
        message: "Data transaksi tidak lengkap",
      });
    }

    if (String(order_id) !== String(req.body.order_id)) {
      return res.status(400).json({
        message: "Order ID transaksi tidak sesuai",
      });
    }

    if (currency && currency !== "IDR") {
      return res.status(400).json({
        message: "Mata uang transaksi tidak sesuai",
      });
    }

    const mapped = mapTransactionStatus(
      transaction_status,
      fraud_status
    );

    if (!mapped) {
      return res.status(200).json({
        message: "Status transaksi belum diproses",
      });
    }

    const {
      paymentStatus,
      orderStatus,
    } = mapped;

    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // 4. Cari percobaan berdasarkan ID transaksi Midtrans.
    const [references] = await connection.execute(
      `SELECT
         id,
         payment_id,
         order_id
       FROM payment_attempts
       WHERE midtrans_order_id = ?`,
      [order_id]
    );

    if (!references.length) {
      await connection.rollback();
      transactionStarted = false;

      console.warn(
        "[midtrans-webhook] Attempt not found:",
        safeLogValue(order_id)
      );

      return res.status(404).json({
        message: "Percobaan pembayaran tidak ditemukan",
      });
    }

    const reference = references[0];

    // 5. Kunci order.
    const [orders] = await connection.execute(
      `SELECT
         id,
         order_code,
         customer_id,
         total_amount,
         status
       FROM orders
       WHERE id = ?
       FOR UPDATE`,
      [reference.order_id]
    );

    if (!orders.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const order = orders[0];

    // 6. Kunci percobaan pembayaran.
    const [attemptRows] = await connection.execute(
      `SELECT *
       FROM payment_attempts
       WHERE id = ?
         AND midtrans_order_id = ?
       FOR UPDATE`,
      [reference.id, order_id]
    );

    if (!attemptRows.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Percobaan pembayaran tidak ditemukan",
      });
    }

    const attempt = attemptRows[0];

    // 7. Kunci ringkasan pembayaran.
    const [paymentRows] = await connection.execute(
      `SELECT *
       FROM payments
       WHERE id = ?
         AND order_id = ?
       FOR UPDATE`,
      [reference.payment_id, order.id]
    );

    if (!paymentRows.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Data pembayaran utama tidak ditemukan",
      });
    }

    const payment = paymentRows[0];

    // 8. Validasi nominal.
    if (
      !isAmountValid(gross_amount, order.total_amount) ||
      !isAmountValid(gross_amount, attempt.amount)
    ) {
      await connection.rollback();
      transactionStarted = false;

      console.warn("[midtrans-webhook] Amount mismatch", {
        order_code: safeLogValue(order.order_code),
        order_id: safeLogValue(order_id),
      });

      return res.status(400).json({
        message: "Nominal pembayaran tidak sesuai",
      });
    }

    // 9. Pastikan transaction ID tidak berubah.
    if (
      attempt.transaction_id &&
      attempt.transaction_id !== transaction_id
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "ID transaksi Midtrans tidak sesuai",
      });
    }

    // 10. Lindungi status terminal dari notifikasi lama.
    if (
      attempt.status === "refunded" &&
      paymentStatus !== "refunded"
    ) {
      await connection.commit();
      transactionStarted = false;

      return res.status(200).json({
        message: "Percobaan pembayaran sudah direfund",
      });
    }

    if (
      attempt.status === "success" &&
      paymentStatus !== "success" &&
      paymentStatus !== "refunded"
    ) {
      await connection.commit();
      transactionStarted = false;

      return res.status(200).json({
        message: "Percobaan pembayaran sudah berhasil",
      });
    }

    // 11. Update riwayat percobaan pembayaran.
    await connection.execute(
      `UPDATE payment_attempts
       SET status = ?,
           transaction_id = ?,
           payment_type = ?,
           transaction_status = ?,
           fraud_status = ?,
           transaction_time = ?,
           settled_at = CASE
             WHEN ? = 'success'
             THEN COALESCE(settled_at, ?)
             ELSE settled_at
           END,
           expired_at = CASE
             WHEN ? = 'expired'
             THEN COALESCE(expired_at, NOW())
             ELSE expired_at
           END,
           midtrans_response = ?
       WHERE id = ?`,
      [
        paymentStatus,
        transaction_id,
        payment_type || null,
        transaction_status,
        fraud_status || null,
        transaction_time || null,
        paymentStatus,
        transaction_time || new Date(),
        paymentStatus,
        JSON.stringify(statusResponse),
        attempt.id,
      ]
    );

    // 12. Update ringkasan pembayaran.
    // Notifikasi pending dari percobaan lama tidak boleh
    // menurunkan status pembayaran yang sudah berhasil.
    const paymentAlreadySuccessful = payment.status === "success";

    if (
      !paymentAlreadySuccessful ||
      paymentStatus === "success" ||
      paymentStatus === "refunded"
    ) {
      await connection.execute(
        `UPDATE payments
         SET status = ?,
             midtrans_order_id = ?,
             transaction_id = ?,
             payment_type = ?,
             transaction_status = ?,
             fraud_status = ?,
             transaction_time = ?,
             settled_at = CASE
               WHEN ? = 'success'
               THEN COALESCE(settled_at, ?)
               ELSE settled_at
             END,
             expired_at = CASE
               WHEN ? = 'expired'
               THEN COALESCE(expired_at, NOW())
               ELSE expired_at
             END,
             midtrans_response = ?
         WHERE id = ?`,
        [
          paymentStatus,
          attempt.midtrans_order_id,
          transaction_id,
          payment_type || null,
          transaction_status,
          fraud_status || null,
          transaction_time || null,
          paymentStatus,
          transaction_time || new Date(),
          paymentStatus,
          JSON.stringify(statusResponse),
          payment.id,
        ]
      );
    }

    // 13. Pembayaran berhasil.
    if (paymentStatus === "success") {
      if (["expired", "cancelled", "refunded"].includes(order.status)) {
        await connection.commit();
        transactionStarted = false;

        console.error(
          "[midtrans-webhook] Successful payment on inactive order:",
          safeLogValue(order.order_code)
        );

        return res.status(200).json({
          message:
            "Pembayaran berhasil, tetapi order tidak aktif dan perlu pemeriksaan",
          payment_status: "success",
          order_status: order.status,
        });
      }

      await connection.execute(
        `UPDATE orders
         SET status = 'paid'
         WHERE id = ?`,
        [order.id]
      );

      const totalIssued = await issueTickets(
        connection,
        order.id
      );

      console.log("[midtrans-webhook] Payment successful", {
        order_code: safeLogValue(order.order_code),
        tickets_issued: totalIssued,
      });
    }

    // 14. Pembayaran direfund.
    else if (paymentStatus === "refunded") {
      await connection.execute(
        `UPDATE orders
         SET status = 'refunded'
         WHERE id = ?`,
        [order.id]
      );

      await connection.execute(
        `UPDATE tickets
         SET status = 'refunded'
         WHERE status = 'valid'
           AND order_item_id IN (
             SELECT id
             FROM order_items
             WHERE order_id = ?
           )`,
        [order.id]
      );
    }

    // 15. Status lainnya.
    else {
      // Jangan menurunkan order yang sudah paid/refunded.
      if (!["paid", "refunded"].includes(order.status)) {
        await connection.execute(
          `UPDATE orders
           SET status = ?
           WHERE id = ?`,
          [orderStatus, order.id]
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      message: "Notifikasi pembayaran berhasil diproses",
      order_code: order.order_code,
      payment_status: paymentStatus,
      order_status:
        paymentStatus === "success"
          ? "paid"
          : paymentStatus === "refunded"
            ? "refunded"
            : orderStatus,
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "[midtrans-webhook] Rollback error:",
          rollbackError.message
        );
      }
    }

    console.error(
      "[midtrans-webhook] Error:",
      error.message
    );

    return res.status(500).json({
      message: "Gagal memproses notifikasi pembayaran",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  handleMidtransWebhook,
};
