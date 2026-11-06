
const db = require("../config/database");
const snap = require("../config/midtrans");

// ==========================================
// CUSTOMER - MIDTRANS PAYMENT
// ==========================================

async function createPayment(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const customerId = req.user.id;

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order tidak valid",
      });
    }

    if (
      !process.env.MIDTRANS_SERVER_KEY ||
      !process.env.MIDTRANS_CLIENT_KEY
    ) {
      return res.status(503).json({
        message: "Konfigurasi Midtrans Sandbox belum tersedia",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [orders] = await connection.execute(
      `SELECT id, order_code, customer_id, total_amount,
              status, expires_at
       FROM orders
       WHERE id = ? AND customer_id = ?
       FOR UPDATE`,
      [orderId, customerId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const order = orders[0];

    if (order.status !== "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Order tidak dalam status pending",
      });
    }

    if (new Date(order.expires_at) <= new Date()) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Masa pembayaran order sudah berakhir",
      });
    }

    const [existingPayments] = await connection.execute(
      `SELECT snap_token, snap_redirect_url
       FROM payments
       WHERE order_id = ?
       AND method = 'midtrans'
       AND status = 'pending'
       AND snap_token IS NOT NULL
       LIMIT 1`,
      [orderId]
    );

    if (existingPayments.length > 0) {
      await connection.commit();
      transactionStarted = false;

      return res.json({
        message: "Halaman pembayaran sudah tersedia",
        payment: {
          snap_token: existingPayments[0].snap_token,
          redirect_url: existingPayments[0].snap_redirect_url,
        },
      });
    }

    const parameter = {
      transaction_details: {
        order_id: order.order_code,
        gross_amount: Number(order.total_amount),
      },
      expiry: {
        unit: "minute",
        duration: 15,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await connection.execute(
      `INSERT INTO payments
       (order_id, method, amount, status,
        transaction_id, payment_type, snap_token,
        snap_redirect_url, transaction_status)
       VALUES (?, 'midtrans', ?, 'pending',
               NULL, NULL, ?, ?, 'pending')`,
      [
        orderId,
        order.total_amount,
        transaction.token,
        transaction.redirect_url,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: "Halaman pembayaran berhasil dibuat",
      payment: {
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Create Midtrans payment error:", error.message);

    return res.status(500).json({
      message: "Gagal membuat pembayaran Midtrans",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// CUSTOMER - MANUAL BANK TRANSFER
// ==========================================

async function uploadPaymentProof(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const customerId = req.user.id;

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order tidak valid",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Bukti pembayaran wajib diunggah",
      });
    }

    const proofImage = `/uploads/payments/${req.file.filename}`;

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [orders] = await connection.execute(
      `SELECT id, customer_id, total_amount, status, expires_at
       FROM orders
       WHERE id = ? AND customer_id = ?
       FOR UPDATE`,
      [orderId, customerId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const order = orders[0];

    if (
      order.status !== "pending" ||
      new Date(order.expires_at) <= new Date()
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Order sudah tidak dapat menerima pembayaran",
      });
    }

    // Cek pembayaran Midtrans yang masih aktif
    const [midtransPayments] = await connection.execute(
      `SELECT id
       FROM payments
       WHERE order_id = ?
       AND method = 'midtrans'
       AND status IN ('pending', 'success')
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );

    if (midtransPayments.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        message: "Order sudah memiliki pembayaran Midtrans",
      });
    }

    // Cek pembayaran transfer manual sebelumnya
    const [existingPayments] = await connection.execute(
      `SELECT id, status
       FROM payments
       WHERE order_id = ?
       AND method = 'bank_transfer'
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );

    let paymentId;

    if (existingPayments.length > 0) {
      const existingPayment = existingPayments[0];

      if (existingPayment.status !== "rejected") {
        await connection.rollback();
        transactionStarted = false;

        return res.status(409).json({
          message:
            "Bukti transfer sedang menunggu verifikasi atau sudah diproses",
        });
      }

      // Perbarui bukti yang sebelumnya ditolak
      paymentId = existingPayment.id;

      await connection.execute(
        `UPDATE payments
         SET proof_image = ?,
             amount = ?,
             status = 'pending',
             rejection_reason = NULL,
             verified_by = NULL,
             paid_at = NULL
         WHERE id = ?`,
        [proofImage, order.total_amount, paymentId]
      );
    } else {
      // Buat pembayaran manual baru
      const [result] = await connection.execute(
        `INSERT INTO payments
         (order_id, method, amount, proof_image, status)
         VALUES (?, 'bank_transfer', ?, ?, 'pending')`,
        [orderId, order.total_amount, proofImage]
      );

      paymentId = result.insertId;
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: "Bukti pembayaran berhasil dikirim",
      payment: {
        id: paymentId,
        order_id: orderId,
        method: "bank_transfer",
        amount: order.total_amount,
        proof_image: proofImage,
        status: "pending",
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Upload payment proof error:", error.message);

    return res.status(500).json({
      message: "Gagal mengunggah bukti pembayaran",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// SUPER ADMIN - LIST PENDING TRANSFERS
// ==========================================

async function getPendingManualPayments(req, res) {
  try {
    const [payments] = await db.execute(
      `SELECT
         p.id AS payment_id,
         p.order_id,
         o.order_code,
         o.customer_id,
         p.amount,
         p.proof_image,
         p.status,
         p.created_at,
         o.expires_at
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       WHERE p.method = 'bank_transfer'
       AND p.status = 'pending'
       ORDER BY p.created_at ASC`
    );

    return res.json({
      message: "Daftar pembayaran manual berhasil diambil",
      total: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get pending payments error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil daftar pembayaran",
    });
  }
}

// ==========================================
// SUPER ADMIN - APPROVE MANUAL TRANSFER
// ==========================================

async function approveManualPayment(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const paymentId = Number(req.params.id);
    const adminId = req.user.id;

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        message: "ID pembayaran tidak valid",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [payments] = await connection.execute(
      `SELECT
         p.id,
         p.order_id,
         p.amount,
         p.status,
         p.method,
         o.status AS order_status,
         o.expires_at,
         o.total_amount
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       WHERE p.id = ?
       FOR UPDATE`,
      [paymentId]
    );

    if (payments.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Pembayaran tidak ditemukan",
      });
    }

    const payment = payments[0];

    if (payment.method !== "bank_transfer") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Pembayaran ini bukan transfer manual",
      });
    }

    if (payment.status !== "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Pembayaran sudah diproses sebelumnya",
      });
    }

    if (payment.order_status !== "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Order tidak dalam status pending",
      });
    }

    if (new Date(payment.expires_at) <= new Date()) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Order sudah kedaluwarsa",
      });
    }

    if (
      Number(payment.amount).toFixed(2) !==
      Number(payment.total_amount).toFixed(2)
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Nominal pembayaran tidak sesuai dengan order",
      });
    }

    // Pastikan tidak ada pembayaran Midtrans yang sudah berhasil
    const [otherPayments] = await connection.execute(
      `SELECT id
       FROM payments
       WHERE order_id = ?
       AND method = 'midtrans'
       AND status = 'success'
       LIMIT 1
       FOR UPDATE`,
      [payment.order_id]
    );

    if (otherPayments.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        message: "Order sudah dibayar melalui Midtrans",
      });
    }

    await connection.execute(
      `UPDATE payments
       SET status = 'success',
           verified_by = ?,
           paid_at = NOW()
       WHERE id = ?`,
      [adminId, paymentId]
    );

    await connection.execute(
      `UPDATE orders
       SET status = 'paid'
       WHERE id = ?`,
      [payment.order_id]
    );

    await connection.commit();
    transactionStarted = false;

    return res.json({
      message: "Pembayaran transfer berhasil disetujui",
      payment_id: paymentId,
      order_id: payment.order_id,
      payment_status: "success",
      order_status: "paid",
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Approve payment error:", error.message);

    return res.status(500).json({
      message: "Gagal menyetujui pembayaran",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// SUPER ADMIN - REJECT MANUAL TRANSFER
// ==========================================

async function rejectManualPayment(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const paymentId = Number(req.params.id);
    const adminId = req.user.id;
    const { rejection_reason } = req.body;

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        message: "ID pembayaran tidak valid",
      });
    }

    if (
      typeof rejection_reason !== "string" ||
      !rejection_reason.trim()
    ) {
      return res.status(400).json({
        message: "Alasan penolakan wajib diisi",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [payments] = await connection.execute(
      `SELECT
         p.id,
         p.order_id,
         p.status,
         p.method,
         o.status AS order_status
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
       WHERE p.id = ?
       FOR UPDATE`,
      [paymentId]
    );

    if (payments.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Pembayaran tidak ditemukan",
      });
    }

    const payment = payments[0];

    if (payment.method !== "bank_transfer") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Pembayaran ini bukan transfer manual",
      });
    }

    if (payment.status !== "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Pembayaran sudah diproses sebelumnya",
      });
    }

    if (payment.order_status !== "pending") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Order tidak dalam status pending",
      });
    }

    await connection.execute(
      `UPDATE payments
       SET status = 'rejected',
           rejection_reason = ?,
           verified_by = ?
       WHERE id = ?`,
      [rejection_reason.trim(), adminId, paymentId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.json({
      message: "Bukti pembayaran berhasil ditolak",
      payment_id: paymentId,
      order_id: payment.order_id,
      payment_status: "rejected",
      order_status: "pending",
      rejection_reason: rejection_reason.trim(),
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }

    console.error("Reject payment error:", error.message);

    return res.status(500).json({
      message: "Gagal menolak pembayaran",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createPayment,
  uploadPaymentProof,
  getPendingManualPayments,
  approveManualPayment,
  rejectManualPayment,
};
