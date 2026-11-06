
const express = require("express");
const router = express.Router();

// Middlewares
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");
const uploadPaymentProof = require("../middlewares/uploadMiddleware");

// Controllers
const {
  createPayment,
  uploadPaymentProof: submitPaymentProof,
  getPendingManualPayments,
  approveManualPayment,
  rejectManualPayment,
} = require("../controllers/paymentsController");

const {
  handleMidtransWebhook,
} = require("../controllers/webhookController");

// ==========================================
// MIDTRANS WEBHOOK
// ==========================================

router.post(
  "/midtrans/webhook",
  handleMidtransWebhook
);

// ==========================================
// CUSTOMER PAYMENT
// ==========================================

// Membuat pembayaran Midtrans
router.post(
  "/orders/:id/payment",
  authenticateToken,
  authorizeRoles("customer"),
  createPayment
);

// Upload bukti transfer manual
router.post(
  "/orders/:id/manual",
  authenticateToken,
  authorizeRoles("customer"),
  uploadPaymentProof.single("proof_image"),
  submitPaymentProof
);

// ==========================================
// SUPER ADMIN PAYMENT VERIFICATION
// ==========================================

// Melihat pembayaran transfer yang menunggu verifikasi
router.get(
  "/manual/pending",
  authenticateToken,
  authorizeRoles("super_admin"),
  getPendingManualPayments
);

// Menyetujui pembayaran transfer
router.patch(
  "/manual/:id/approve",
  authenticateToken,
  authorizeRoles("super_admin"),
  approveManualPayment
);

// Menolak pembayaran transfer
router.patch(
  "/manual/:id/reject",
  authenticateToken,
  authorizeRoles("super_admin"),
  rejectManualPayment
);

module.exports = router;
