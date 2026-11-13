
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

// =====================================================
// HELPER
// =====================================================

function isValidId(value) {
  return /^\d+$/.test(String(value));
}

function getPosterUrl(file) {
  return file ? `/uploads/posters/${file.filename}` : null;
}

function deletePoster(posterUrl) {
  if (!posterUrl) return;

  const filePath = path.join(
    __dirname,
    "..",
    posterUrl.replace(/^\/+/, "")
  );

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (error) => {
      if (error) console.error("Delete poster error:", error.message);
    });
  }
}

function deleteUploadedFile(req) {
  if (req.file) {
    fs.unlink(req.file.path, (error) => {
      if (error) console.error("Delete uploaded file error:", error.message);
    });
  }
}

async function saveArtist(connection, eventId, artistName, artistCountry) {
  if (!artistName || !artistName.trim()) return;

  const name = artistName.trim();
  const country = artistCountry?.trim() || null;

  const [existingArtists] = await connection.execute(
    "SELECT id FROM artists WHERE name = ? LIMIT 1",
    [name]
  );

  let artistId;

  if (existingArtists.length > 0) {
    artistId = existingArtists[0].id;

    await connection.execute(
      `UPDATE artists
       SET country = COALESCE(?, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [country, artistId]
    );
  } else {
    const [result] = await connection.execute(
      `INSERT INTO artists (name, country)
       VALUES (?, ?)`,
      [name, country]
    );

    artistId = result.insertId;
  }

  await connection.execute(
    `INSERT INTO event_artists (event_id, artist_id)
     VALUES (?, ?)`,
    [eventId, artistId]
  );
}

async function attachArtists(events) {
  for (const event of events) {
    const [artists] = await db.execute(
      `SELECT
         a.id,
         a.name,
         a.country,
         a.photo
       FROM event_artists ea
       JOIN artists a ON ea.artist_id = a.id
       WHERE ea.event_id = ?`,
      [event.id]
    );

    event.artists = artists;
  }

  return events;
}

async function attachStartingPrice(events) {
  for (const event of events) {
    const [prices] = await db.execute(
      `SELECT MIN(price) AS starting_price
       FROM ticket_categories
       WHERE event_id = ?`,
      [event.id]
    );

    event.starting_price = prices[0]?.starting_price ?? null;
  }

  return events;
}

async function attachEventDetails(events) {
  await attachArtists(events);
  await attachStartingPrice(events);
  return events;
}

// =====================================================
// GET /api/events
// CUSTOMER: DAFTAR KONSER
// =====================================================

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
        v.longitude,

        u.id AS organizer_id,
        u.name AS organizer_name

      FROM events e

      JOIN categories c ON e.category_id = c.id
      JOIN venues v ON e.venue_id = v.id
      JOIN users u ON e.organizer_id = u.id

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
      params.push(
        `%${location.trim()}%`,
        `%${location.trim()}%`
      );
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

    await attachEventDetails(events);

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

// =====================================================
// GET /api/events/:id
// CUSTOMER: DETAIL KONSER
// =====================================================

async function getEventById(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
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
         v.longitude,

         u.id AS organizer_id,
         u.name AS organizer_name

       FROM events e
       JOIN categories c ON e.category_id = c.id
       JOIN venues v ON e.venue_id = v.id
       JOIN users u ON e.organizer_id = u.id

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
      `SELECT
         a.id,
         a.name,
         a.country,
         a.photo
       FROM event_artists ea
       JOIN artists a ON ea.artist_id = a.id
       WHERE ea.event_id = ?`,
      [id]
    );

    const [ticketCategories] = await db.execute(
      `SELECT
         id,
         name,
         price,
         quota,
         benefit
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
        starting_price:
          ticketCategories.length > 0
            ? ticketCategories[0].price
            : null,
      },
    });
  } catch (error) {
    console.error("Get event detail error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil detail konser",
    });
  }
}

// =====================================================
// GET /api/events/my-events
// ORGANIZER: KONSER MILIK SENDIRI
// =====================================================

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

    await attachEventDetails(events);

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

// =====================================================
// POST /api/events
// ORGANIZER: TAMBAH KONSER
// =====================================================

async function createEvent(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const {
      name,
      description,
      category_id,
      venue_id,
      start_date,
      end_date,
      artist_name,
      artist_country,
    } = req.body;

    if (
      !name?.trim() ||
      !description?.trim() ||
      !category_id ||
      !venue_id ||
      !start_date ||
      !end_date
    ) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Semua data konser wajib diisi",
      });
    }

    if (
      !isValidId(category_id) ||
      !isValidId(venue_id)
    ) {
      deleteUploadedFile(req);

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
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    if (categories.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      deleteUploadedFile(req);

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
      transactionStarted = false;
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Venue tidak ditemukan",
      });
    }

    const posterUrl = getPosterUrl(req.file);

    const [result] = await connection.execute(
      `INSERT INTO events (
         organizer_id,
         category_id,
         venue_id,
         name,
         description,
         poster_url,
         start_date,
         end_date,
         status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        category_id,
        venue_id,
        name.trim(),
        description.trim(),
        posterUrl,
        start_date,
        end_date,
      ]
    );

    if (artist_name?.trim()) {
      await saveArtist(
        connection,
        result.insertId,
        artist_name,
        artist_country
      );
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message:
        "Konser berhasil dibuat dan menunggu persetujuan Super Admin",
      event: {
        id: result.insertId,
        organizer_id: req.user.id,
        name: name.trim(),
        description: description.trim(),
        poster_url: posterUrl,
        category_id: Number(category_id),
        venue_id: Number(venue_id),
        start_date,
        end_date,
        artist_name: artist_name?.trim() || null,
        artist_country: artist_country?.trim() || null,
        status: "pending",
      },
    });
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback();
    }

    deleteUploadedFile(req);

    console.error("Create event error:", error.message);

    return res.status(500).json({
      message: "Gagal membuat konser",
    });
  } finally {
    if (connection) connection.release();
  }
}

// =====================================================
// PUT /api/events/:id
// ORGANIZER: EDIT KONSER
// =====================================================

async function updateEvent(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const { id } = req.params;

    const {
      name,
      description,
      category_id,
      venue_id,
      start_date,
      end_date,
      artist_name,
      artist_country,
    } = req.body;

    if (!isValidId(id)) {
      deleteUploadedFile(req);

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
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Semua data konser wajib diisi",
      });
    }

    if (
      !isValidId(category_id) ||
      !isValidId(venue_id)
    ) {
      deleteUploadedFile(req);

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
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [events] = await connection.execute(
      `SELECT id, status, poster_url
       FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (events.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      deleteUploadedFile(req);

      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    if (!["pending", "rejected"].includes(events[0].status)) {
      await connection.rollback();
      transactionStarted = false;
      deleteUploadedFile(req);

      return res.status(400).json({
        message:
          "Konser hanya dapat diedit jika berstatus pending atau rejected",
      });
    }

    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    const [venues] = await connection.execute(
      "SELECT id FROM venues WHERE id = ?",
      [venue_id]
    );

    if (!categories.length || !venues.length) {
      await connection.rollback();
      transactionStarted = false;
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Kategori atau venue tidak ditemukan",
      });
    }

    const oldPoster = events[0].poster_url;
    const newPoster = req.file
      ? getPosterUrl(req.file)
      : oldPoster;

    await connection.execute(
      `UPDATE events
       SET name = ?,
           description = ?,
           category_id = ?,
           venue_id = ?,
           poster_url = ?,
           start_date = ?,
           end_date = ?,
           status = 'pending',
           rejection_reason = NULL,
           approved_by = NULL,
           approved_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND organizer_id = ?`,
      [
        name.trim(),
        description.trim(),
        category_id,
        venue_id,
        newPoster,
        start_date,
        end_date,
        id,
        req.user.id,
      ]
    );

    // Jika data artis dikirim, perbarui relasi artis.
    if (artist_name !== undefined) {
      await connection.execute(
        "DELETE FROM event_artists WHERE event_id = ?",
        [id]
      );

      if (artist_name.trim()) {
        await saveArtist(
          connection,
          id,
          artist_name,
          artist_country
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    if (req.file && oldPoster) {
      deletePoster(oldPoster);
    }

    return res.json({
      message: "Konser berhasil diperbarui dan menunggu persetujuan",
      event_id: Number(id),
      poster_url: newPoster,
      status: "pending",
    });
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback();
    }

    deleteUploadedFile(req);

    console.error("Update event error:", error.message);

    return res.status(500).json({
      message: "Gagal memperbarui konser",
    });
  } finally {
    if (connection) connection.release();
  }
}

// =====================================================
// DELETE /api/events/:id
// ORGANIZER: HAPUS KONSER
// =====================================================

async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT id, status, poster_url
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
        message:
          "Konser hanya dapat dihapus jika berstatus pending atau rejected",
      });
    }

    await db.execute(
      "DELETE FROM event_artists WHERE event_id = ?",
      [id]
    );

    await db.execute(
      `DELETE FROM events
       WHERE id = ? AND organizer_id = ?`,
      [id, req.user.id]
    );

    deletePoster(events[0].poster_url);

    return res.json({
      message: "Konser berhasil dihapus",
      event_id: Number(id),
    });
  } catch (error) {
    console.error("Delete event error:", error.message);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Konser tidak dapat dihapus karena sudah memiliki data tiket atau transaksi",
      });
    }

    return res.status(500).json({
      message: "Gagal menghapus konser",
    });
  }
}

// =====================================================
// GET /api/events/pending
// SUPER ADMIN: DAFTAR KONSER MENUNGGU PERSETUJUAN
// =====================================================

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

    await attachEventDetails(events);

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

// =====================================================
// PATCH /api/events/:id/approve
// SUPER ADMIN: SETUJUI KONSER
// =====================================================

async function approveEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      "SELECT id, status FROM events WHERE id = ?",
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

// =====================================================
// PATCH /api/events/:id/reject
// SUPER ADMIN: TOLAK KONSER
// =====================================================

async function rejectEvent(req, res) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!isValidId(id)) {
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
      "SELECT id, status FROM events WHERE id = ?",
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

// =====================================================
// EXPORT
// =====================================================

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
