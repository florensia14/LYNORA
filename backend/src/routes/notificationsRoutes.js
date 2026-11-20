
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const notificationsController = require("../controllers/notificationsController");

// GET all notifications
router.get(
  "/",
  authMiddleware,
  notificationsController.getNotifications
);

// MARK ALL AS READ
router.patch(
  "/read-all",
  authMiddleware,
  notificationsController.markAllNotificationsRead
);

// MARK SINGLE NOTIFICATION AS READ
router.patch(
  "/:id/read",
  authMiddleware,
  notificationsController.markNotificationRead
);

module.exports = router;
