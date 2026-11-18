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
  publishEvent,
  unpublishEvent,
} = require("../controllers/eventsController");

const {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
} = require("../controllers/ticketCategoriesController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// ======================================================
// CUSTOMER
// ======================================================

// Daftar konser yang sudah disetujui dan dipublikasikan.
router.get("/", getEvents);

// Detail konser.
router.get("/:id", getEventById);

// ======================================================
// EVENT ORGANIZER
// ======================================================

// Daftar konser milik EO.
router.get(
  "/my-events",
  authenticateToken,
  authorizeRoles("organizer"),
  getMyEvents
);

// Buat konser.
router.post(
  "/",
  authenticateToken,
  authorizeRoles("organizer"),
  upload.single("poster"),
  createEvent
);

// Edit konser.
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("organizer"),
  upload.single("poster"),
  updateEvent
);

// Hapus konser.
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("organizer"),
  deleteEvent
);

// Publikasikan konser.
router.patch(
  "/:id/publish",
  authenticateToken,
  authorizeRoles("organizer"),
  publishEvent
);

// Batalkan publikasi konser.
router.patch(
  "/:id/unpublish",
  authenticateToken,
  authorizeRoles("organizer"),
  unpublishEvent
);

// ======================================================
// EVENT ORGANIZER: TICKET CATEGORIES
// ======================================================

router.post(
  "/:id/tickets",
  authenticateToken,
  authorizeRoles("organizer"),
  createTicketCategory
);

router.get(
  "/:id/tickets",
  authenticateToken,
  authorizeRoles("organizer"),
  getTicketCategories
);

router.put(
  "/:id/tickets/:ticketId",
  authenticateToken,
  authorizeRoles("organizer"),
  updateTicketCategory
);

router.delete(
  "/:id/tickets/:ticketId",
  authenticateToken,
  authorizeRoles("organizer"),
  deleteTicketCategory
);

// ======================================================
// SUPER ADMIN
// ======================================================

// Daftar konser pending dan revisi.
router.get(
  "/pending",
  authenticateToken,
  authorizeRoles("super_admin"),
  getPendingEvents
);

// Setujui konser.
router.patch(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("super_admin"),
  approveEvent
);

// Tolak konser.
router.patch(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("super_admin"),
  rejectEvent
);

module.exports = router;