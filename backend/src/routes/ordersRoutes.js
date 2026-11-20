const express = require("express");
const router = express.Router();

const {
  checkout,
  getMyOrders,
} = require("../controllers/ordersController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

router.get(
  "/my-orders",
  authenticateToken,
  authorizeRoles("customer"),
  getMyOrders
);

router.post(
  "/checkout",
  authenticateToken,
  authorizeRoles("customer"),
  checkout
);

module.exports = router;