
const express = require("express");
const router = express.Router();

const {
  checkout,
} = require("../controllers/ordersController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

// Customer checkout tiket
router.post(
  "/checkout",
  authenticateToken,
  authorizeRoles("customer"),
  checkout
);

module.exports = router;
