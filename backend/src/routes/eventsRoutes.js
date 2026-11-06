const express = require("express");

const {
  getEvents,
  getEventById,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getPendingEvents,
  approveEvent,
  rejectEvent,
} = require("../controllers/eventsController");

const {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
} = require("../controllers/ticketCategoriesController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

const router = express.Router();

// Customer: jelajah konser
router.get("/", getEvents);

// Event Organizer: daftar konser milik sendiri
router.get(
  "/my-events",
  authenticateToken,
  authorizeRoles("organizer"),
  getMyEvents
);

// Super Admin: daftar konser yang menunggu approval
router.get(
  "/pending",
  authenticateToken,
  authorizeRoles("super_admin"),
  getPendingEvents
);

// Event Organizer: menambahkan kategori tiket
router.post(
  "/:id/tickets",
  authenticateToken,
  authorizeRoles("organizer"),
  createTicketCategory
);

// EO: melihat kategori tiket
router.get(
  "/:id/tickets",
  authenticateToken,
  authorizeRoles("organizer"),
  getTicketCategories
);

// EO: mengedit kategori tiket
router.put(
  "/:id/tickets/:ticketId",
  authenticateToken,
  authorizeRoles("organizer"),
  updateTicketCategory
);

// EO: menghapus kategori tiket
router.delete(
  "/:id/tickets/:ticketId",
  authenticateToken,
  authorizeRoles("organizer"),
  deleteTicketCategory
);

// Customer: detail konser
router.get("/:id", getEventById);

// Event Organizer: membuat konser
router.post(
  "/",
  authenticateToken,
  authorizeRoles("organizer"),
  createEvent
);

// Event Organizer: mengubah konser
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("organizer"),
  updateEvent
);

// Event Organizer: menghapus konser
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("organizer"),
  deleteEvent
);

// Super Admin: menyetujui konser
router.patch(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("super_admin"),
  approveEvent
);

// Super Admin: menolak konser
router.patch(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("super_admin"),
  rejectEvent
);

module.exports = router;