
const express = require("express");
const router = express.Router();

const {
  getMyTickets,
} = require("../controllers/ticketsController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

// Customer: Get My Tickets
router.get(
  "/my-tickets",
  authenticateToken,
  authorizeRoles("customer"),
  getMyTickets
);

module.exports = router;
