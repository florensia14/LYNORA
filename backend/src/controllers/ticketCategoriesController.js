
const db = require("../config/database");

// ======================================================
// HELPER
// ======================================================

const isValidId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
};

const getOrganizerEvent = async (eventId, organizerId) => {
  const [events] = await db.execute(
    `SELECT id, status
     FROM events
     WHERE id = ? AND organizer_id = ?
     LIMIT 1`,
    [eventId, organizerId]
  );

  return events[0] || null;
};

// ======================================================
// CREATE TICKET CATEGORY
// POST /api/events/:id/tickets
// ======================================================

const createTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const organizerId = req.user?.id;

    const { name, price, quota, benefit } = req.body;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        message: "Event ID tidak valid",
      });
    }

    if (!organizerId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Nama kategori tiket wajib diisi",
      });
    }

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);

    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
      return res.status(400).json({
        message: "Harga tiket harus berupa angka minimal 0",
      });
    }

    if (!Number.isSafeInteger(ticketQuota) || ticketQuota <= 0) {
      return res.status(400).json({
        message: "Kuota tiket harus berupa bilangan bulat lebih dari 0",
      });
    }

    const event = await getOrganizerEvent(eventId, organizerId);

    if (!event) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    // Kategori hanya dapat ditambahkan pada konser pending atau published.
    if (!["pending", "published"].includes(event.status)) {
      return res.status(400).json({
        message: "Kategori tiket tidak dapat ditambahkan pada status konser ini",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO ticket_categories
        (event_id, name, price, quota, benefit)
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventId,
        String(name).trim(),
        ticketPrice,
        ticketQuota,
        benefit ? String(benefit).trim() : null,
      ]
    );

    const [categories] = await db.execute(
      `SELECT
         id,
         event_id,
         name,
         price,
         quota,
         benefit,
         created_at,
         updated_at
       FROM ticket_categories
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Kategori tiket berhasil ditambahkan",
      ticket_category: categories[0],
    });
  } catch (error) {
    console.error("Create Ticket Category Error:", error);

    return res.status(500).json({
      message: "Gagal menambahkan kategori tiket",
    });
  }
};

// ======================================================
// GET TICKET CATEGORIES
// GET /api/events/:id/tickets
// ======================================================

const getTicketCategories = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const organizerId = req.user?.id;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        message: "Event ID tidak valid",
      });
    }

    if (!organizerId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const event = await getOrganizerEvent(eventId, organizerId);

    if (!event) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    const [categories] = await db.execute(
      `SELECT
         id,
         event_id,
         name,
         price,
         quota,
         benefit,
         created_at,
         updated_at
       FROM ticket_categories
       WHERE event_id = ?
       ORDER BY price ASC`,
      [eventId]
    );

    return res.status(200).json({
      message: "Berhasil mengambil kategori tiket",
      event_id: eventId,
      total: categories.length,
      ticket_categories: categories,
    });
  } catch (error) {
    console.error("Get Ticket Categories Error:", error);

    return res.status(500).json({
      message: "Gagal mengambil kategori tiket",
    });
  }
};

// ======================================================
// UPDATE TICKET CATEGORY
// PUT /api/events/:id/tickets/:ticketId
// ======================================================

const updateTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const ticketId = Number(req.params.ticketId);
    const organizerId = req.user?.id;

    const { name, price, quota, benefit } = req.body;

    if (!isValidId(eventId) || !isValidId(ticketId)) {
      return res.status(400).json({
        message: "Event ID atau Ticket ID tidak valid",
      });
    }

    if (!organizerId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Nama kategori tiket wajib diisi",
      });
    }

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);

    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
      return res.status(400).json({
        message: "Harga tiket harus berupa angka minimal 0",
      });
    }

    if (!Number.isSafeInteger(ticketQuota) || ticketQuota <= 0) {
      return res.status(400).json({
        message: "Kuota tiket harus berupa bilangan bulat lebih dari 0",
      });
    }

    const event = await getOrganizerEvent(eventId, organizerId);

    if (!event) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    const [categories] = await db.execute(
      `SELECT id
       FROM ticket_categories
       WHERE id = ? AND event_id = ?
       LIMIT 1`,
      [ticketId, eventId]
    );

    if (!categories.length) {
      return res.status(404).json({
        message: "Kategori tiket tidak ditemukan",
      });
    }

    await db.execute(
      `UPDATE ticket_categories
       SET
         name = ?,
         price = ?,
         quota = ?,
         benefit = ?
       WHERE id = ? AND event_id = ?`,
      [
        String(name).trim(),
        ticketPrice,
        ticketQuota,
        benefit ? String(benefit).trim() : null,
        ticketId,
        eventId,
      ]
    );

    return res.status(200).json({
      message: "Kategori tiket berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update Ticket Category Error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui kategori tiket",
    });
  }
};

// ======================================================
// DELETE TICKET CATEGORY
// DELETE /api/events/:id/tickets/:ticketId
// ======================================================

const deleteTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const ticketId = Number(req.params.ticketId);
    const organizerId = req.user?.id;

    if (!isValidId(eventId) || !isValidId(ticketId)) {
      return res.status(400).json({
        message: "Event ID atau Ticket ID tidak valid",
      });
    }

    if (!organizerId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const event = await getOrganizerEvent(eventId, organizerId);

    if (!event) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    const [categories] = await db.execute(
      `SELECT id
       FROM ticket_categories
       WHERE id = ? AND event_id = ?
       LIMIT 1`,
      [ticketId, eventId]
    );

    if (!categories.length) {
      return res.status(404).json({
        message: "Kategori tiket tidak ditemukan",
      });
    }

    await db.execute(
      `DELETE FROM ticket_categories
       WHERE id = ? AND event_id = ?`,
      [ticketId, eventId]
    );

    return res.status(200).json({
      message: "Kategori tiket berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete Ticket Category Error:", error);

    return res.status(500).json({
      message: "Gagal menghapus kategori tiket",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
};
