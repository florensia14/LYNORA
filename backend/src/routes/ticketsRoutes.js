
const express = require("express");
const router = express.Router();

const {
  getMyTickets,
  getOrganizerCheckIns,
  organizerCheckIn,
  getOrganizerAttendees,
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


// Organizer: daftar peserta/tiket dari konser milik EO.
router.get(
  "/organizer/attendees",
  authenticateToken,
  authorizeRoles("organizer"),
  getOrganizerAttendees
);

module.exports = router;

// Organizer: statistik check-in konser milik EO.
router.get(
  "/organizer/check-ins",
  authenticateToken,
  authorizeRoles("organizer"),
  getOrganizerCheckIns
);

// Organizer: validasi QR dan check-in tiket.
router.post(
  "/organizer/check-in",
  authenticateToken,
  authorizeRoles("organizer"),
  organizerCheckIn
);
