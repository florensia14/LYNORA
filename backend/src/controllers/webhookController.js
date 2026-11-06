
const db = require("../config/database");
const midtransClient = require("midtrans-client");

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function handleMidtransWebhook(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    if (!process.env.MIDTRANS_SERVER_KEY) {
      return res.status(503).json({
        message: "Midtrans Server Key belum dikonfigurasi",
      });
    }

    // Verifikasi notifikasi melalui Midtrans
    const statusResponse =
      await core.transaction.notification(req.body);

    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      gross_amount,
      currency,
    } = statusResponse;

    if (
      !order_id ||
      !transaction_id ||
      gross_amount === undefined ||
      gross_amount === null
    ) {
      return res.status(400).json({
        message: "Data notifikasi tidak lengkap",
      });
    }

    if (currency && currency !== "IDR") {
      return res.status(400).json({
        message: "Mata uang transaksi tidak sesuai",
      });
    }

    let paymentStatus;
    let orderStatus;

    // Tentukan status berdasarkan notifikasi Midtrans
    if (transaction_status === "settlement") {
      paymentStatus = "success";
      orderStatus = "paid";
    } else if (transaction_status === "capture") {
      if (fraud_status === "accept") {
        paymentStatus = "success";
        orderStatus = "paid";
      } else if (fraud_status === "challenge") {
        paymentStatus = "pending";
        orderStatus = "pending";
      } else {
        return res.status(200).json({
          message: "Transaksi menunggu pemeriksaan",
        });
      }
    } else if (transaction_status === "pending") {
      paymentStatus = "pending";
      orderStatus = "pending";
    } else if (transaction_status === "expire") {
      paymentStatus = "failed";
      orderStatus = "expired";
    } else if (
      ["deny", "cancel"].includes(transaction_status)
    ) {
      paymentStatus = "failed";
      orderStatus = "cancelled";
    } else if (transaction_status === "refund") {
      paymentStatus = "refunded";
      orderStatus = "refunded";
    } else {
      return res.status(200).json({
        message: "Status transaksi belum diproses",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Cari dan kunci order
    const [orders] = await connection.execute(
      `SELECT id, order_code, total_amount, status
       FROM orders
       WHERE order_code = ?
       FOR UPDATE`,
      [order_id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const order = orders[0];

    // Validasi nominal pembayaran
    if (
      Number(gross_amount).toFixed(2) !==
      Number(order.total_amount).toFixed(2)
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Nominal pembayaran tidak sesuai",
      });
    }

    // Ambil data pembayaran Midtrans
    const [payments] = await connection.execute(
      `SELECT id, status, transaction_id
       FROM payments
       WHERE order_id = ?
       AND method = 'midtrans'
       FOR UPDATE`,
      [order.id]
    );

    if (payments.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Pembayaran Midtrans tidak ditemukan",
      });
    }

    const payment = payments[0];

    // Pastikan ID transaksi sesuai
    if (
      payment.transaction_id &&
      payment.transaction_id !== transaction_id
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "ID transaksi Midtrans tidak sesuai",
      });
    }

    // Jangan menurunkan status pembayaran yang sudah berhasil
    if (
      payment.status === "success" &&
      paymentStatus !== "refunded"
    ) {
      await connection.commit();
      transactionStarted = false;

      return res.status(200).json({
        message: "Pembayaran sudah berhasil diproses",
      });
    }

    // Jangan mengubah order yang sudah direfund
    if (
      order.status === "refunded" &&
      paymentStatus !== "refunded"
    ) {
      await connection.commit();
      transactionStarted = false;

      return res.status(200).json({
        message: "Order sudah direfund",
      });
    }

    // Order tidak aktif tidak boleh otomatis menjadi paid
    if (
      ["expired", "cancelled"].includes(order.status) &&
      paymentStatus === "success"
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(200).json({
        message:
          "Order sudah tidak aktif. Pembayaran perlu diperiksa.",
      });
    }

    // Perbarui data pembayaran
    await connection.execute(
      `UPDATE payments
       SET status = ?,
           transaction_id = ?,
           payment_type = ?,
           transaction_status = ?,
           paid_at = CASE
             WHEN ? = 'success'
             THEN COALESCE(paid_at, NOW())
             ELSE paid_at
           END
       WHERE id = ?`,
      [
        paymentStatus,
        transaction_id,
        payment_type || null,
        transaction_status,
        paymentStatus,
        payment.id,
      ]
    );

    // Perbarui status order
    await connection.execute(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      [orderStatus, order.id]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      message: "Notifikasi pembayaran berhasil diproses",
      order_code: order.order_code,
      payment_status: paymentStatus,
      order_status: orderStatus,
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error(
      "Midtrans webhook error:",
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

module.exports = { handleMidtransWebhook };
