const express = require("express");
const router = express.Router();

const {
  checkout,
  getMyOrders,
  getOrganizerOrders,
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

router.post(
  "/checkout",
  authenticateToken,
  authorizeRoles("customer"),
  checkout
);

module.exports = router;