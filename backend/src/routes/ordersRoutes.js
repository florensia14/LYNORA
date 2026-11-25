const express = require("express");
const router = express.Router();

const {
  checkout,
  getMyOrders,
  getOrganizerOrders,
  getOrganizerSalesDetail,
  getAdminOrders,
  getAdminOrderEvents,
  getAdminOrderDetail,
} = require("../controllers/ordersController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

router.get(
  "/my-orders",
  authenticateToken,
  authorizeRoles("customer"),
  getMyOrders
);

router.get(
  "/organizer-orders",
  authenticateToken,
  authorizeRoles("organizer"),
  getOrganizerOrders
);

router.get(
  "/organizer-sales/:eventId",
  authenticateToken,
  authorizeRoles("organizer"),
  getOrganizerSalesDetail
);

// Super Admin: Orders & Transactions
router.get(
  "/admin/events",
  authenticateToken,
  authorizeRoles("super_admin"),
  getAdminOrderEvents
);

router.get(
  "/admin/:id",
  authenticateToken,
  authorizeRoles("super_admin"),
  getAdminOrderDetail
);

router.get(
  "/admin",
  authenticateToken,
  authorizeRoles("super_admin"),
  getAdminOrders
);

router.post(
  "/checkout",
  authenticateToken,
  authorizeRoles("customer"),
  checkout
);

module.exports = router;