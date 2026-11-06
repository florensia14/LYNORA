
const db = require("../config/database");

// GET /api/events
async function getEvents(req, res) {
  try {
    const { search, category, location, date } = req.query;

    let sql = `
      SELECT
        e.id,
        e.name,
        e.description,
        e.poster_url,
        e.start_date,
        e.end_date,
        e.status,
        c.id AS category_id,
        c.name AS category_name,
        v.id AS venue_id,
        v.name AS venue_name,
        v.address AS venue_address,
        v.latitude,
        v.longitude
      FROM events e
      JOIN categories c ON e.category_id = c.id
      JOIN venues v ON e.venue_id = v.id
      WHERE e.status = 'published'
    `;

    const params = [];

    if (search) {
      sql += " AND e.name LIKE ?";
      params.push(`%${search.trim()}%`);
    }

    if (category) {
      sql += " AND c.name = ?";
      params.push(category.trim());
    }

    if (location) {
      sql += " AND (v.name LIKE ? OR v.address LIKE ?)";
      params.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          message: "Format tanggal harus YYYY-MM-DD",
        });
      }

      sql += " AND DATE(e.start_date) = ?";
      params.push(date);
    }

    sql += " ORDER BY e.start_date ASC";

    const [events] = await db.execute(sql, params);

    return res.json({
      message: "Daftar konser berhasil diambil",
      total: events.length,
      events,
    });
  } catch (error) {
    console.error("Get events error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil daftar konser",
    });
  }
}

// GET /api/events/:id
async function getEventById(req, res) {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT
        e.id,
        e.name,
        e.description,
        e.poster_url,
        e.start_date,
        e.end_date,
        e.status,
        c.id AS category_id,
        c.name AS category_name,
        v.id AS venue_id,
        v.name AS venue_name,
        v.address AS venue_address,
        v.latitude,
        v.longitude
      FROM events e
      JOIN categories c ON e.category_id = c.id
      JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ? AND e.status = 'published'`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    const event = events[0];

    const [artists] = await db.execute(
      `SELECT a.id, a.name, a.photo
       FROM event_artists ea
       JOIN artists a ON ea.artist_id = a.id
       WHERE ea.event_id = ?`,
      [id]
    );

    const [ticketCategories] = await db.execute(
      `SELECT id, name, price, quota, benefit
       FROM ticket_categories
       WHERE event_id = ?
       ORDER BY price ASC`,
      [id]
    );

    return res.json({
      message: "Detail konser berhasil diambil",
      event: {
        ...event,
        artists,
        ticket_categories: ticketCategories,
      },
    });
  } catch (error) {
    console.error("Get event detail error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil detail konser",
    });
  }
}

// GET /api/events/my-events
async function getMyEvents(req, res) {
  try {
    const [events] = await db.execute(
      `SELECT
        e.id,
        e.name,
        e.description,
        e.poster_url,
        e.start_date,
        e.end_date,
        e.status,
        e.rejection_reason,
        e.created_at,
        c.id AS category_id,
        c.name AS category_name,
        v.id AS venue_id,
        v.name AS venue_name,
        v.address AS venue_address,
        v.latitude,
        v.longitude
      FROM events e
      JOIN categories c ON e.category_id = c.id
      JOIN venues v ON e.venue_id = v.id
      WHERE e.organizer_id = ?
      ORDER BY e.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      message: "Daftar konser berhasil diambil",
      total: events.length,
      events,
    });
  } catch (error) {
    console.error("Get organizer events error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil daftar konser",
    });
  }
}

// POST /api/events
async function createEvent(req, res) {
  let connection;

  try {
    const {
      name,
      description,
      category_id,
      venue_id,
      start_date,
      end_date,
    } = req.body;

    if (
      !name?.trim() ||
      !description?.trim() ||
      !category_id ||
      !venue_id ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        message: "Semua data konser wajib diisi",
      });
    }

    if (
      !Number.isInteger(Number(category_id)) ||
      !Number.isInteger(Number(venue_id))
    ) {
      return res.status(400).json({
        message: "Category ID dan Venue ID harus berupa angka",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    if (categories.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Kategori konser tidak ditemukan",
      });
    }

    const [venues] = await connection.execute(
      "SELECT id FROM venues WHERE id = ?",
      [venue_id]
    );

    if (venues.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Venue tidak ditemukan",
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO events (
        organizer_id,
        category_id,
        venue_id,
        name,
        description,
        start_date,
        end_date,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        category_id,
        venue_id,
        name.trim(),
        description.trim(),
        start_date,
        end_date,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message:
        "Konser berhasil dibuat dan menunggu persetujuan Super Admin",
      event: {
        id: result.insertId,
        organizer_id: req.user.id,
        name: name.trim(),
        category_id,
        venue_id,
        start_date,
        end_date,
        status: "pending",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Create event error:", error.message);

    return res.status(500).json({
      message: "Gagal membuat konser",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category_id,
      venue_id,
      start_date,
      end_date,
    } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    if (
      !name?.trim() ||
      !description?.trim() ||
      !category_id ||
      !venue_id ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        message: "Semua data konser wajib diisi",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    const [events] = await db.execute(
      "SELECT id, status FROM events WHERE id = ? AND organizer_id = ?",
      [id, req.user.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    if (!["pending", "rejected"].includes(events[0].status)) {
      return res.status(400).json({
        message: "Konser hanya dapat diedit jika berstatus pending atau rejected",
      });
    }

    const [categories] = await db.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    const [venues] = await db.execute(
      "SELECT id FROM venues WHERE id = ?",
      [venue_id]
    );

    if (!categories.length || !venues.length) {
      return res.status(400).json({
        message: "Kategori atau venue tidak ditemukan",
      });
    }

    const isRejected = events[0].status === "rejected";

    await db.execute(
      `UPDATE events
       SET name = ?,
           description = ?,
           category_id = ?,
           venue_id = ?,
           start_date = ?,
           end_date = ?,
           status = ?,
           rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND organizer_id = ?`,
      [
        name.trim(),
        description.trim(),
        category_id,
        venue_id,
        start_date,
        end_date,
        isRejected ? "pending" : "pending",
        id,
        req.user.id,
      ]
    );

    return res.json({
      message: "Konser berhasil diperbarui",
      event_id: Number(id),
      status: "pending",
    });
  } catch (error) {
    console.error("Update event error:", error.message);

    return res.status(500).json({
      message: "Gagal memperbarui konser",
    });
  }
}

async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

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

    if (!["pending", "rejected"].includes(events[0].status)) {
      return res.status(400).json({
        message: "Konser hanya dapat dihapus jika berstatus pending atau rejected",
      });
    }

    await db.execute(
      `DELETE FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    return res.json({
      message: "Konser berhasil dihapus",
      event_id: Number(id),
    });
  } catch (error) {
    console.error("Delete event error:", error.message);

    return res.status(500).json({
      message: "Gagal menghapus konser",
    });
  }
}

async function getPendingEvents(req, res) {
  try {
    const [events] = await db.execute(
      `SELECT
        e.id,
        e.name,
        e.description,
        e.poster_url,
        e.start_date,
        e.end_date,
        e.status,
        e.created_at,
        c.name AS category_name,
        v.name AS venue_name,
        v.address AS venue_address,
        u.name AS organizer_name
      FROM events e
      JOIN categories c ON e.category_id = c.id
      JOIN venues v ON e.venue_id = v.id
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at ASC`
    );

    return res.json({
      message: "Daftar konser pending berhasil diambil",
      total: events.length,
      events,
    });
  } catch (error) {
    console.error("Get pending events error:", error.message);
    return res.status(500).json({
      message: "Gagal mengambil daftar konser pending",
    });
  }
}

async function approveEvent(req, res) {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT id, status
       FROM events
       WHERE id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    if (events[0].status !== "pending") {
      return res.status(400).json({
        message: "Hanya konser berstatus pending yang dapat disetujui",
      });
    }

    await db.execute(
      `UPDATE events
       SET status = 'published',
           approved_by = ?,
           approved_at = NOW(),
           rejection_reason = NULL
       WHERE id = ?`,
      [req.user.id, id]
    );

    return res.json({
      message: "Konser berhasil disetujui dan dipublikasikan",
      event_id: Number(id),
      status: "published",
    });
  } catch (error) {
    console.error("Approve event error:", error.message);

    return res.status(500).json({
      message: "Gagal menyetujui konser",
    });
  }
}

async function rejectEvent(req, res) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    if (
      typeof rejection_reason !== "string" ||
      !rejection_reason.trim()
    ) {
      return res.status(400).json({
        message: "Alasan penolakan wajib diisi",
      });
    }

    const [events] = await db.execute(
      `SELECT id, status
       FROM events
       WHERE id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    if (events[0].status !== "pending") {
      return res.status(400).json({
        message: "Hanya konser berstatus pending yang dapat ditolak",
      });
    }

    await db.execute(
      `UPDATE events
       SET status = 'rejected',
           rejection_reason = ?,
           approved_by = NULL,
           approved_at = NULL
       WHERE id = ?`,
      [rejection_reason.trim(), id]
    );

    return res.json({
      message: "Konser berhasil ditolak",
      event_id: Number(id),
      status: "rejected",
      rejection_reason: rejection_reason.trim(),
    });
  } catch (error) {
    console.error("Reject event error:", error.message);

    return res.status(500).json({
      message: "Gagal menolak konser",
    });
  }
}

module.exports = {
  getEvents,
  getEventById,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getPendingEvents,
  approveEvent,
  rejectEvent,
};