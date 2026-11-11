
const db = require("../config/database");
const midtransConfig = require("../config/midtrans");
const crypto = require("crypto");

const {
  buildSnapParameter,
  isSnapTokenUsable,
  mapMidtransError,
  toRupiahInteger,
} = require("../utils/midtransHelpers");

function generateMidtransOrderId(orderId) {
  return `LYN-${orderId}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}

function isOrderExpired(expiresAt) {
  const time = new Date(expiresAt).getTime();
  return !Number.isFinite(time) || time <= Date.now();
}

async function createPayment(req, res) {
  let connection;
  let lockAcquired = false;
  let transactionStarted = false;

  const orderId = Number(req.params.id);
  const customerId = req.user?.id;
  const lockName = `lynora_pay_${orderId}`;

  try {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "ID order tidak valid" });
    }

    if (!customerId) {
      return res.status(401).json({ message: "Belum terautentikasi" });
    }

    const config = midtransConfig.validateConfiguration();

    if (!config.ready) {
      return res.status(503).json({
        message: "Konfigurasi Midtrans belum siap",
      });
    }

    connection = await db.getConnection();

    const [lockRows] = await connection.execute(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [lockName]
    );

    if (Number(lockRows[0]?.acquired) !== 1) {
      return res.status(409).json({
        message: "Pembayaran sedang diproses. Coba kembali.",
      });
    }

    lockAcquired = true;

    await connection.beginTransaction();
    transactionStarted = true;

    const [orders] = await connection.execute(
      `SELECT
         o.id,
         o.order_code,
         o.customer_id,
         o.total_amount,
         o.status,
         o.expires_at,
         u.name AS customer_name,
         u.email AS customer_email
       FROM orders o
       INNER JOIN users u ON u.id = o.customer_id
       WHERE o.id = ? AND o.customer_id = ?
       FOR UPDATE`,
      [orderId, customerId]
    );

    if (!orders.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    const order = orders[0];

    if (order.status !== "pending") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Order tidak dalam status pending",
      });
    }

    if (isOrderExpired(order.expires_at)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Masa pembayaran order sudah berakhir",
      });
    }

    const amount = toRupiahInteger(order.total_amount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Nominal order tidak valid",
      });
    }

    // Ambil ringkasan pembayaran.
    const [paymentRows] = await connection.execute(
      `SELECT id, status
       FROM payments
       WHERE order_id = ?
       FOR UPDATE`,
      [orderId]
    );

    let payment = paymentRows[0];

    // Buat ringkasan pembayaran jika belum ada.
    if (!payment) {
      const initialMidtransId = generateMidtransOrderId(orderId);

      const [insertResult] = await connection.execute(
        `INSERT INTO payments (
           order_id,
           midtrans_order_id,
           amount,
           status,
           transaction_status
         )
         VALUES (?, ?, ?, 'pending', 'pending')`,
        [orderId, initialMidtransId, amount]
      );

      payment = {
        id: insertResult.insertId,
        status: "pending",
      };
    }

    if (payment.status === "success" || payment.status === "refunded") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        message: "Pembayaran order sudah diproses",
      });
    }

    // Ambil percobaan pembayaran terbaru.
    const [attemptRows] = await connection.execute(
      `SELECT *
       FROM payment_attempts
       WHERE order_id = ?
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );

    const latestAttempt = attemptRows[0] || null;

    if (latestAttempt?.status === "success") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        message: "Order sudah berhasil dibayar",
      });
    }

    // Gunakan kembali token yang masih berlaku.
    if (
      latestAttempt?.status === "pending" &&
      latestAttempt.snap_token &&
      isSnapTokenUsable({
        tokenCreatedAt: latestAttempt.snap_token_created_at,
        orderExpiresAt: order.expires_at,
      })
    ) {
      await connection.commit();
      transactionStarted = false;

      return res.json({
        message: "Halaman pembayaran masih tersedia",
        payment: {
          snap_token: latestAttempt.snap_token,
          redirect_url: latestAttempt.redirect_url,
        },
      });
    }

    /*
     * Jangan membuat percobaan baru jika percobaan sebelumnya
     * masih pending. Statusnya harus diperiksa melalui Midtrans
     * terlebih dahulu, termasuk jika token sudah tidak berlaku.
     */
    if (latestAttempt?.status === "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        message:
          "Transaksi sebelumnya masih perlu diverifikasi. Silakan coba kembali setelah statusnya diperbarui.",
      });
    }

    const [itemRows] = await connection.execute(
      `SELECT
         oi.ticket_category_id,
         oi.quantity,
         oi.price_at_purchase,
         tc.name
       FROM order_items oi
       INNER JOIN ticket_categories tc
         ON tc.id = oi.ticket_category_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      [orderId]
    );

    if (!itemRows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Order tidak memiliki item tiket",
      });
    }

    const items = itemRows.map((item) => ({
      id: item.ticket_category_id,
      name: item.name,
      price: item.price_at_purchase,
      quantity: item.quantity,
    }));

    const midtransOrderId = generateMidtransOrderId(orderId);

    // Simpan percobaan terlebih dahulu agar webhook dapat mengenalinya.
    await connection.execute(
      `INSERT INTO payment_attempts (
         payment_id,
         order_id,
         midtrans_order_id,
         amount,
         status,
         transaction_status
       )
       VALUES (?, ?, ?, ?, 'pending', 'pending')`,
      [payment.id, orderId, midtransOrderId, amount]
    );

    await connection.execute(
      `UPDATE payments
       SET midtrans_order_id = ?,
           amount = ?,
           status = 'pending',
           transaction_id = NULL,
           snap_token = NULL,
           redirect_url = NULL,
           payment_type = NULL,
           transaction_status = 'pending',
           fraud_status = NULL,
           transaction_time = NULL,
           settled_at = NULL,
           expired_at = NULL,
           midtrans_response = NULL
       WHERE id = ?`,
      [midtransOrderId, amount, payment.id]
    );

    await connection.commit();
    transactionStarted = false;

    // Buat parameter Snap.
    let snapParameter;

    try {
      snapParameter = buildSnapParameter({
        order: {
          ...order,
          order_code: midtransOrderId,
        },
        items,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
        },
      });
    } catch (error) {
      await connection.execute(
        `UPDATE payment_attempts
         SET status = 'failed',
             transaction_status = 'failed'
         WHERE midtrans_order_id = ?
           AND status = 'pending'`,
        [midtransOrderId]
      );

      await connection.execute(
        `UPDATE payments
         SET status = 'failed',
             transaction_status = 'failed'
         WHERE id = ?
           AND midtrans_order_id = ?
           AND status = 'pending'`,
        [payment.id, midtransOrderId]
      );

      console.error("[midtrans] Parameter error:", error.message);

      return res.status(400).json({
        message: "Data pembayaran tidak valid",
      });
    }

    // Minta transaksi Snap ke Midtrans.
    let transaction;

    try {
      transaction = await midtransConfig
        .getSnap()
        .createTransaction(snapParameter);
    } catch (error) {
      const mapped = mapMidtransError(error);

      console.error(
        `[midtrans] Create transaction error (${mapped.code}):`,
        mapped.logDetail
      );

      /*
       * Jangan langsung mengubah status menjadi failed untuk
       * gangguan jaringan/server. Transaksi mungkin sudah dibuat.
       */
      if (
        mapped.code !== "upstream_unavailable" &&
        mapped.code !== "upstream_error"
      ) {
        await connection.execute(
          `UPDATE payment_attempts
           SET status = 'failed',
               transaction_status = 'failed'
           WHERE midtrans_order_id = ?
             AND status = 'pending'`,
          [midtransOrderId]
        );

        await connection.execute(
          `UPDATE payments
           SET status = 'failed',
               transaction_status = 'failed'
           WHERE id = ?
             AND midtrans_order_id = ?
             AND status = 'pending'`,
          [payment.id, midtransOrderId]
        );
      }

      return res.status(mapped.status).json({
        message: mapped.message,
      });
    }

    if (!transaction?.token) {
      return res.status(502).json({
        message:
          "Token belum diterima. Status transaksi perlu diperiksa kembali.",
      });
    }

    // Simpan token pada percobaan pembayaran.
    const [attemptUpdate] = await connection.execute(
      `UPDATE payment_attempts
       SET snap_token = ?,
           redirect_url = ?,
           snap_token_created_at = NOW()
       WHERE midtrans_order_id = ?
         AND status = 'pending'`,
      [
        transaction.token,
        transaction.redirect_url || null,
        midtransOrderId,
      ]
    );

    if (attemptUpdate.affectedRows === 0) {
      return res.status(409).json({
        message: "Status transaksi sudah berubah",
      });
    }

    // Update ringkasan hanya jika percobaan ini masih yang terbaru.
    await connection.execute(
      `UPDATE payments
       SET snap_token = ?,
           redirect_url = ?
       WHERE id = ?
         AND midtrans_order_id = ?
         AND status = 'pending'`,
      [
        transaction.token,
        transaction.redirect_url || null,
        payment.id,
        midtransOrderId,
      ]
    );

    return res.status(201).json({
      message: "Halaman pembayaran berhasil dibuat",
      payment: {
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("[midtrans] Rollback error:", rollbackError.message);
      }
    }

    console.error("[midtrans] Create payment error:", error.message);

    return res.status(500).json({
      message: "Gagal membuat pembayaran Midtrans",
    });
  } finally {
    if (connection) {
      try {
        if (lockAcquired) {
          await connection.execute(
            "SELECT RELEASE_LOCK(?)",
            [lockName]
          );
        }
      } catch (error) {
        console.error("[midtrans] Release lock error:", error.message);
      } finally {
        connection.release();
      }
    }
  }
}

module.exports = {
  createPayment,
};
