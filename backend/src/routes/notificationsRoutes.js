const express = require("express");
const router = express.Router();

const authenticateToken = require("../middlewares/authMiddleware");

const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationsController");

// GET: Mengambil notifikasi user
router.get("/", authenticateToken, getNotifications);

// PATCH: Tandai semua notifikasi sudah dibaca
router.patch("/read-all", authenticateToken, markAllNotificationsRead);

// PATCH: Tandai satu notifikasi sudah dibaca
router.patch("/:id/read", authenticateToken, markNotificationRead);

module.exports = router;