
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");
const { webhookRateLimiter } = require("../middlewares/rateLimit");

const {
  createPayment,
} = require("../controllers/paymentsController");

const {
  handleMidtransWebhook,
  checkPaymentStatus,
} = require("../controllers/webhookController");

// Webhook Midtrans
router.post(
  "/midtrans/webhook",
  webhookRateLimiter,
  handleMidtransWebhook
);

// Membuat pembayaran untuk customer
router.post(
  "/orders/:id/payment",
  authenticateToken,
  authorizeRoles("customer"),
  createPayment
);

router.get(
  "/orders/:id/status",
  authenticateToken,
  authorizeRoles("customer"),
  checkPaymentStatus
);

module.exports = router;
