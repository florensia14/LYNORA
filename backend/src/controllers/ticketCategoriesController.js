
const db = require("../config/database");

// POST /api/events/:id/tickets
async function createTicketCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, price, quota, benefit } = req.body;

    // Validasi ID konser
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    // Validasi input
    if (
      !name?.trim() ||
      price === undefined ||
      quota === undefined
    ) {
      return res.status(400).json({
        message: "Nama, harga, dan kuota tiket wajib diisi",
      });
    }

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);

    if (
      !Number.isFinite(ticketPrice) ||
      ticketPrice < 0 ||
      !Number.isInteger(ticketQuota) ||
      ticketQuota <= 0
    ) {
      return res.status(400).json({
        message: "Harga harus berupa angka minimal 0 dan kuota harus bilangan bulat positif",
      });
    }

    // Cek kepemilikan dan status konser
    const [events] = await db.execute(
      `SELECT id, status
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    if (!["pending", "published"].includes(events[0].status)) {
      return res.status(400).json({
        message: "Kategori tiket hanya dapat ditambahkan pada konser pending atau published",
      });
    }

    // Simpan kategori tiket
    const [result] = await db.execute(
      `INSERT INTO ticket_categories
       (event_id, name, price, quota, benefit)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        ticketPrice,
        ticketQuota,
        benefit?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Kategori tiket berhasil ditambahkan",
      ticket_category: {
        id: result.insertId,
        event_id: Number(id),
        name: name.trim(),
        price: ticketPrice,
        quota: ticketQuota,
        benefit: benefit?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Create ticket category error:", error.message);

    return res.status(500).json({
      message: "Gagal menambahkan kategori tiket",
    });
  }
}

// GET /api/events/:id/tickets
async function getTicketCategories(req, res) {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    // Pastikan konser milik EO yang sedang login
    const [events] = await db.execute(
      `SELECT id
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    // Ambil kategori tiket
    const [tickets] = await db.execute(
      `SELECT id, event_id, name, price, quota, benefit,
              created_at, updated_at
       FROM ticket_categories
       WHERE event_id = ?
       ORDER BY price ASC`,
      [id]
    );

    return res.json({
      message: "Daftar kategori tiket berhasil diambil",
      event_id: Number(id),
      total: tickets.length,
      ticket_categories: tickets,
    });
  } catch (error) {
    console.error("Get ticket categories error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil daftar kategori tiket",
    });
  }
}


// PUT /api/events/:id/tickets/:ticketId
async function updateTicketCategory(req, res) {
  try {
    const { id, ticketId } = req.params;
    const { name, price, quota, benefit } = req.body;

    if (!/^\d+$/.test(id) || !/^\d+$/.test(ticketId)) {
      return res.status(400).json({
        message: "ID konser atau kategori tiket tidak valid",
      });
    }

    if (!name?.trim() || price === undefined || quota === undefined) {
      return res.status(400).json({
        message: "Nama, harga, dan kuota tiket wajib diisi",
      });
    }

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);

    if (
      !Number.isFinite(ticketPrice) ||
      ticketPrice < 0 ||
      !Number.isInteger(ticketQuota) ||
      ticketQuota <= 0
    ) {
      return res.status(400).json({
        message: "Harga harus berupa angka minimal 0 dan kuota harus bilangan bulat positif",
      });
    }

    // Pastikan konser milik EO yang sedang login
    const [events] = await db.execute(
      `SELECT id
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    // Pastikan kategori tiket berasal dari konser tersebut
    const [tickets] = await db.execute(
      `SELECT id
       FROM ticket_categories
       WHERE id = ? AND event_id = ?`,
      [ticketId, id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        message: "Kategori tiket tidak ditemukan",
      });
    }

    await db.execute(
      `UPDATE ticket_categories
       SET name = ?, price = ?, quota = ?, benefit = ?
       WHERE id = ? AND event_id = ?`,
      [
        name.trim(),
        ticketPrice,
        ticketQuota,
        benefit?.trim() || null,
        ticketId,
        id,
      ]
    );

    return res.json({
      message: "Kategori tiket berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update ticket category error:", error.message);

    return res.status(500).json({
      message: "Gagal memperbarui kategori tiket",
    });
  }
}


// DELETE /api/events/:id/tickets/:ticketId
async function deleteTicketCategory(req, res) {
  try {
    const { id, ticketId } = req.params;

    if (!/^\d+$/.test(id) || !/^\d+$/.test(ticketId)) {
      return res.status(400).json({
        message: "ID konser atau kategori tiket tidak valid",
      });
    }

    // Pastikan konser milik EO yang sedang login
    const [events] = await db.execute(
      `SELECT id
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    // Pastikan kategori tiket berasal dari konser tersebut
    const [tickets] = await db.execute(
      `SELECT id
       FROM ticket_categories
       WHERE id = ? AND event_id = ?`,
      [ticketId, id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        message: "Kategori tiket tidak ditemukan",
      });
    }

    await db.execute(
      `DELETE FROM ticket_categories
       WHERE id = ? AND event_id = ?`,
      [ticketId, id]
    );

    return res.json({
      message: "Kategori tiket berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete ticket category error:", error.message);

    return res.status(500).json({
      message: "Gagal menghapus kategori tiket",
    });
  }
}

module.exports = {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
};