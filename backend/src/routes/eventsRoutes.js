
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
const upload = require("../middlewares/uploadMiddleware");

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

// Super Admin: daftar konser pending
router.get(
  "/pending",
  authenticateToken,
  authorizeRoles("super_admin"),
  getPendingEvents
);

// Event Organizer: kategori tiket
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

// Event Organizer: membuat konser + upload poster
router.post(
  "/",
  authenticateToken,
  authorizeRoles("organizer"),
  upload.single("poster"),
  createEvent
);

// Event Organizer: mengubah konser + upload poster opsional
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("organizer"),
  upload.single("poster"),
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

// Customer: detail konser
router.get("/:id", getEventById);

module.exports = router;
