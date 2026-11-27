const db = require("../config/database");
const { createNotification, notifyRole } = require("../services/notificationService");
const fs = require("fs");
const path = require("path");

// ======================================================
// HELPERS
// ======================================================

function isValidId(value) {
  return /^\d+$/.test(String(value ?? ""));
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPosterUrl(file) {
  return file ? `/uploads/posters/${file.filename}` : null;
}

function deleteUploadedFile(req) {
  if (req.file?.path && fs.existsSync(req.file.path)) {
    fs.unlink(req.file.path, (error) => {
      if (error) {
        console.error("Delete uploaded file error:", error.message);
      }
    });
  }
}

function deletePoster(posterUrl) {
  if (!posterUrl || typeof posterUrl !== "string") return;

  const filename = path.basename(posterUrl);
  const filePath = path.join(
    __dirname,
    "..",
    "uploads",
    "posters",
    filename
  );

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (error) => {
      if (error) {
        console.error("Delete poster error:", error.message);
      }
    });
  }
}

async function rollbackIfNeeded(connection, transactionStarted) {
  if (connection && transactionStarted) {
    await connection.rollback();
  }
}

// ======================================================
// ARTISTS
// ======================================================

async function saveArtist(connection, eventId, artistName, artistCountry) {
  const name = cleanString(artistName);

  if (!name) return;

  const country = cleanString(artistCountry) || null;

  const [existing] = await connection.execute(
    "SELECT id FROM artists WHERE name = ? LIMIT 1",
    [name]
  );

  let artistId;

  if (existing.length) {
    artistId = existing[0].id;

    await connection.execute(
      `UPDATE artists
       SET country = COALESCE(?, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [country, artistId]
    );
  } else {
    const [result] = await connection.execute(
      "INSERT INTO artists (name, country) VALUES (?, ?)",
      [name, country]
    );

    artistId = result.insertId;
  }

  await connection.execute(
    "INSERT INTO event_artists (event_id, artist_id) VALUES (?, ?)",
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
       JOIN artists a ON a.id = ea.artist_id
       WHERE ea.event_id = ?
       ORDER BY a.name ASC`,
      [event.id]
    );

    event.artists = artists;
  }

  return events;
}

// ======================================================
// TICKET AVAILABILITY
// ======================================================

async function attachTicketAvailability(events) {
  for (const event of events) {
    const [categories] = await db.execute(
      `SELECT
         tc.id,
         tc.event_id,
         tc.name,
         tc.price,
         tc.quota,
         tc.benefit,
         COALESCE(
           SUM(
             CASE
               WHEN o.status = 'paid'
                AND t.status IN ('valid', 'used')
               THEN 1
               ELSE 0
             END
           ),
           0
         ) AS sold
       FROM ticket_categories tc
       LEFT JOIN order_items oi
         ON oi.ticket_category_id = tc.id
       LEFT JOIN orders o
         ON o.id = oi.order_id
       LEFT JOIN tickets t
         ON t.order_item_id = oi.id
       WHERE tc.event_id = ?
       GROUP BY
         tc.id,
         tc.event_id,
         tc.name,
         tc.price,
         tc.quota,
         tc.benefit
       ORDER BY tc.price ASC`,
      [event.id]
    );

    event.ticket_categories = categories.map((category) => {
      const quota = Number(category.quota || 0);
      const sold = Number(category.sold || 0);

      return {
        ...category,
        price: Number(category.price || 0),
        quota,
        sold,
        remaining: Math.max(quota - sold, 0),
      };
    });

    event.total_quota = event.ticket_categories.reduce(
      (sum, category) => sum + category.quota,
      0
    );

    event.total_sold = event.ticket_categories.reduce(
      (sum, category) => sum + category.sold,
      0
    );

    event.remaining_tickets = Math.max(
      event.total_quota - event.total_sold,
      0
    );

    const now = new Date();

    const eventEnd = parseDate(event.end_date);
    const salesStart = parseDate(event.sales_start_at);
    const salesEnd = parseDate(event.sales_end_at);

    const eventStart = parseDate(event.start_date);

    // Concert lifecycle and ticket-sales lifecycle are independent.
    if (eventEnd && now >= eventEnd) {
      event.lifecycle_status = "completed";
    } else if (eventStart && now >= eventStart) {
      event.lifecycle_status = "ongoing";
    } else {
      event.lifecycle_status = "upcoming";
    }

    if (eventEnd && now >= eventEnd) {
      event.sales_status = "ended";
    } else if (
      event.total_quota > 0 &&
      event.remaining_tickets === 0
    ) {
      event.sales_status = "sold_out";
    } else if (!salesStart) {
      event.sales_status = "not_available";
    } else if (now < salesStart) {
      event.sales_status = "coming_soon";
    } else if (salesEnd && now > salesEnd) {
      event.sales_status = "sales_closed";
    } else {
      event.sales_status = "on_sale";
    }
  }

  // Return harus di luar loop.
  return events;
}

// ======================================================
// STARTING PRICE
// ======================================================

async function attachStartingPrice(events) {
  for (const event of events) {
    const [rows] = await db.execute(
      `SELECT MIN(price) AS starting_price
       FROM ticket_categories
       WHERE event_id = ?`,
      [event.id]
    );

    event.starting_price =
      rows[0]?.starting_price == null
        ? null
        : Number(rows[0].starting_price);
  }

  return events;
}

async function attachEventDetails(events) {
  await attachArtists(events);
  await attachStartingPrice(events);
  await attachTicketAvailability(events);

  return events;
}

// ======================================================
// SALES DATE VALIDATION
// ======================================================

function validateSalesWindow(salesStartValue, salesEndValue) {
  if (!salesStartValue && !salesEndValue) {
    return {
      valid: true,
      salesStart: null,
      salesEnd: null,
    };
  }

  const salesStart = parseDate(salesStartValue);

  const salesEnd = salesEndValue
    ? parseDate(salesEndValue)
    : null;

  if (!salesStart || (salesEndValue && !salesEnd)) {
    return { valid: false };
  }

  if (salesEnd && salesEnd <= salesStart) {
    return { valid: false };
  }

  return {
    valid: true,
    salesStart: salesStartValue,
    salesEnd: salesEndValue || null,
  };
}

// ======================================================
// CUSTOMER: GET ALL PUBLISHED EVENTS
// ======================================================

async function getEvents(req, res) {
  try {
    const search = cleanString(req.query.search);
    const category = cleanString(req.query.category);
    const location = cleanString(req.query.location);
    const date = cleanString(req.query.date);

    let sql = `
      SELECT
        e.id,
        e.name,
        e.description,
        e.poster_url,
        e.start_date,
        e.end_date,
        e.status,
        e.approval_status,
        e.publication_status,
        e.sales_start_at,
        e.sales_end_at,

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

      JOIN categories c
        ON c.id = e.category_id

      JOIN venues v
        ON v.id = e.venue_id

      JOIN users u
        ON u.id = e.organizer_id

      WHERE e.approval_status = 'approved'
        AND e.publication_status = 'published'
        AND e.deleted_at IS NULL
    `;

    const params = [];

    if (search) {
  const keyword = `%${search}%`;

  sql += `
    AND (
      e.name LIKE ?
      OR e.description LIKE ?
      OR c.name LIKE ?
      OR v.name LIKE ?
      OR v.address LIKE ?
      OR EXISTS (
        SELECT 1
        FROM event_artists ea
        JOIN artists a ON a.id = ea.artist_id
        WHERE ea.event_id = e.id
          AND a.name LIKE ?
      )
    )
  `;

  params.push(
    keyword,
    keyword,
    keyword,
    keyword,
    keyword,
    keyword
  );
}

    if (category) {
      sql += " AND c.name = ?";
      params.push(category);
    }

    if (location) {
      sql += `
        AND (
          v.name LIKE ?
          OR v.address LIKE ?
        )
      `;

      params.push(`%${location}%`, `%${location}%`);
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
    console.error("Get events error:", error);

    return res.status(500).json({
      message: "Gagal mengambil daftar konser",
    });
  }
}

// ======================================================
// CUSTOMER: GET EVENT DETAIL
// ======================================================

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
         e.approval_status,
         e.publication_status,
         e.sales_start_at,
         e.sales_end_at,

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

       JOIN categories c
         ON c.id = e.category_id

       JOIN venues v
         ON v.id = e.venue_id

       JOIN users u
         ON u.id = e.organizer_id

       WHERE e.id = ?
         AND e.approval_status = 'approved'
         AND e.publication_status = 'published'
          AND e.deleted_at IS NULL`,
      [id]
    );

    if (!events.length) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    await attachEventDetails(events);

    return res.json({
      message: "Detail konser berhasil diambil",
      event: events[0],
    });
  } catch (error) {
    console.error("Get event detail error:", error);

    return res.status(500).json({
      message: "Gagal mengambil detail konser",
    });
  }
}

// ======================================================
// ORGANIZER: GET MY EVENTS
// ======================================================

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
         e.approval_status,
         e.publication_status,
         e.sales_start_at,
         e.sales_end_at,
         e.rejection_reason,
         e.created_at,
         e.updated_at,

         c.id AS category_id,
         c.name AS category_name,

         v.id AS venue_id,
         v.name AS venue_name,
         v.address AS venue_address,
         v.latitude,
         v.longitude

       FROM events e

       JOIN categories c
         ON c.id = e.category_id

       JOIN venues v
         ON v.id = e.venue_id

       WHERE e.organizer_id = ?
         AND e.deleted_at IS NULL

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
    console.error("Get organizer events error:", error);

    return res.status(500).json({
      message: "Gagal mengambil daftar konser",
    });
  }
}
// ======================================================

// Resolve a venue from free-text organizer input. Existing records are reused only
// when all identifying fields match; shared venue rows are never overwritten.
async function resolveVenue(connection, { venue_id, venue_name, venue_address, latitude, longitude }) {
  const name = cleanString(venue_name);
  const address = cleanString(venue_address) || name;
  if (name) {
    const lat = latitude === "" || latitude == null ? null : Number(latitude);
    const lon = longitude === "" || longitude == null ? null : Number(longitude);
    if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
        (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180))) {
      throw new Error("Koordinat venue tidak valid");
    }
    if (lat === null || lon === null) throw new Error("Pilih lokasi venue dari hasil pencarian agar latitude dan longitude terisi otomatis");
    const [matches] = await connection.execute(
      `SELECT id FROM venues WHERE name = ? AND address = ?
       AND (latitude <=> ?) AND (longitude <=> ?) LIMIT 1`,
      [name, address, lat, lon]
    );
    if (matches.length) return Number(matches[0].id);
    const [inserted] = await connection.execute(
      `INSERT INTO venues (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [name, address, lat, lon]
    );
    return Number(inserted.insertId);
  }
  if (venue_id && isValidId(venue_id)) {
    const [rows] = await connection.execute("SELECT id FROM venues WHERE id = ?", [venue_id]);
    if (rows.length) return Number(rows[0].id);
  }
  throw new Error("Nama venue dan alamat wajib diisi");
}

// ORGANIZER: CREATE EVENT
// ======================================================

async function createEvent(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    const {
      name,
      description,
      category_id,
      venue_id,
      venue_name,
      venue_address,
      latitude,
      longitude,
      start_date,
      end_date,
      artist_name,
      artist_country,
      sales_start_at,
      sales_end_at,
    } = req.body;

    if (
      !cleanString(name) ||
      !cleanString(description) ||
      !category_id ||
      !(cleanString(venue_name) || venue_id) ||
      !start_date ||
      !end_date
    ) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message:
          "Nama, deskripsi, kategori, venue, tanggal mulai, dan tanggal selesai wajib diisi",
      });
    }

    if (!isValidId(category_id) || (venue_id && !isValidId(venue_id))) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Category ID dan Venue ID harus berupa angka",
      });
    }

    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);

    if (!startDate || !endDate || endDate <= startDate) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    const salesWindow = validateSalesWindow(
      sales_start_at,
      sales_end_at
    );

    if (!salesWindow.valid) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Jadwal penjualan tiket tidak valid",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    if (!categories.length) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;
      deleteUploadedFile(req);
      return res.status(400).json({ message: "Kategori konser tidak ditemukan" });
    }

    let resolvedVenueId;
    try {
      resolvedVenueId = await resolveVenue(connection, { venue_id, venue_name, venue_address, latitude, longitude });
    } catch (venueError) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;
      deleteUploadedFile(req);
      return res.status(400).json({ message: venueError.message || "Data venue tidak valid" });
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
        sales_start_at,
        sales_end_at,
        status,
        approval_status,
        publication_status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'pending',
        'pending',
        'draft'
      )`,
      [
        req.user.id,
        Number(category_id),
        resolvedVenueId,
        cleanString(name),
        cleanString(description),
        posterUrl,
        start_date,
        end_date,
        salesWindow.salesStart,
        salesWindow.salesEnd,
      ]
    );

    if (cleanString(artist_name)) {
      await saveArtist(
        connection,
        result.insertId,
        artist_name,
        artist_country
      );
    }

    await connection.commit();
    transactionStarted = false;

    // Notify every active Super Admin when an organizer submits a concert.
    try {
      await notifyRole("super_admin", {
        eventId: result.insertId,
        title: "New Concert Submission",
        message: `${cleanString(name)} has been submitted and is waiting for your review.`,
        type: "concert_submission",
      });
    } catch (notificationError) {
      console.error("Create concert notification error:", notificationError.message);
    }

    return res.status(201).json({
      message:
        "Konser berhasil dibuat dan menunggu persetujuan Super Admin",

      event: {
        id: result.insertId,
        organizer_id: req.user.id,
        name: cleanString(name),
        description: cleanString(description),
        poster_url: posterUrl,
        category_id: Number(category_id),
        venue_id: resolvedVenueId,
        venue_name: cleanString(venue_name),
        venue_address: cleanString(venue_address),
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
        start_date,
        end_date,
        sales_start_at: salesWindow.salesStart,
        sales_end_at: salesWindow.salesEnd,
        approval_status: "pending",
        publication_status: "draft",
        status: "pending",
      },
    });
  } catch (error) {
    await rollbackIfNeeded(connection, transactionStarted);

    deleteUploadedFile(req);

    console.error("Create event error:", error);

    return res.status(500).json({
      message: "Gagal membuat konser",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ======================================================
// ORGANIZER: UPDATE EVENT
// ======================================================

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
      venue_name,
      venue_address,
      latitude,
      longitude,
      start_date,
      end_date,
      artist_name,
      artist_country,
      sales_start_at,
      sales_end_at,
    } = req.body;

    if (!isValidId(id)) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    if (
      !cleanString(name) ||
      !cleanString(description) ||
      !category_id ||
      !(cleanString(venue_name) || venue_id) ||
      !start_date ||
      !end_date
    ) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message:
          "Nama, deskripsi, kategori, venue, tanggal mulai, dan tanggal selesai wajib diisi",
      });
    }

    if (!isValidId(category_id) || (venue_id && !isValidId(venue_id))) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Category ID dan Venue ID harus berupa angka",
      });
    }

    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);

    if (!startDate || !endDate || endDate <= startDate) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Tanggal konser tidak valid",
      });
    }

    const salesWindow = validateSalesWindow(
      sales_start_at,
      sales_end_at
    );

    if (!salesWindow.valid) {
      deleteUploadedFile(req);

      return res.status(400).json({
        message: "Jadwal penjualan tiket tidak valid",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [events] = await connection.execute(
      `SELECT
        id,
        status,
        approval_status,
        publication_status,
        poster_url,
        sales_start_at,
        sales_end_at
       FROM events
       WHERE id = ?
         AND organizer_id = ?
       FOR UPDATE`,
      [id, req.user.id]
    );

    if (!events.length) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;

      deleteUploadedFile(req);

      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    const currentApproval =
      events[0].approval_status || events[0].status;

    const wasApproved = currentApproval === "approved";

    if (
      !wasApproved &&
      !["pending", "rejected", "revision_required"].includes(currentApproval)
    ) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;

      deleteUploadedFile(req);

      return res.status(400).json({
        message:
          "Konser hanya dapat diedit jika berstatus pending, rejected, atau revision_required",
      });
    }

    const [categories] = await connection.execute(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );

    if (!categories.length) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;
      deleteUploadedFile(req);
      return res.status(400).json({ message: "Kategori konser tidak ditemukan" });
    }

    let resolvedVenueId;
    try {
      resolvedVenueId = await resolveVenue(connection, { venue_id, venue_name, venue_address, latitude, longitude });
    } catch (venueError) {
      await rollbackIfNeeded(connection, transactionStarted);
      transactionStarted = false;
      deleteUploadedFile(req);
      return res.status(400).json({ message: venueError.message || "Data venue tidak valid" });
    }

    const oldPoster = events[0].poster_url;

    const newPoster = req.file
      ? getPosterUrl(req.file)
      : oldPoster;

    await connection.execute(
      `UPDATE events
       SET
         name = ?,
         description = ?,
         category_id = ?,
         venue_id = ?,
         poster_url = ?,
         start_date = ?,
         end_date = ?,
         sales_start_at = ?,
         sales_end_at = ?,
         status = ?,
         approval_status = ?,
         publication_status = ?,
         rejection_reason = CASE WHEN ? = 1 THEN rejection_reason ELSE NULL END,
         approved_by = CASE WHEN ? = 1 THEN approved_by ELSE NULL END,
         approved_at = CASE WHEN ? = 1 THEN approved_at ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND organizer_id = ?`,
      [
        cleanString(name),
        cleanString(description),
        Number(category_id),
        resolvedVenueId,
        newPoster,
        start_date,
        end_date,
        salesWindow.salesStart ?? events[0].sales_start_at ?? null,
        salesWindow.salesEnd ?? events[0].sales_end_at ?? null,
        wasApproved ? events[0].status : "pending",
        wasApproved ? "approved" : "pending",
        wasApproved ? events[0].publication_status : "draft",
        wasApproved ? 1 : 0,
        wasApproved ? 1 : 0,
        wasApproved ? 1 : 0,
        id,
        req.user.id,
      ]
    );

    if (artist_name !== undefined) {
      await connection.execute(
        "DELETE FROM event_artists WHERE event_id = ?",
        [id]
      );

      if (cleanString(artist_name)) {
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
      message: wasApproved
        ? "Konser berhasil diperbarui"
        : "Konser berhasil diperbarui dan dikirim ulang untuk persetujuan",
      event_id: Number(id),
      venue_id: resolvedVenueId,
      venue_name: cleanString(venue_name),
      venue_address: cleanString(venue_address),
      latitude: latitude === "" || latitude == null ? null : Number(latitude),
      longitude: longitude === "" || longitude == null ? null : Number(longitude),
      poster_url: newPoster,
      status: wasApproved ? events[0].status : "pending",
      approval_status: wasApproved ? "approved" : "pending",
      publication_status: wasApproved ? events[0].publication_status : "draft",
      display_status: getDisplayStatus({
        approval_status: wasApproved ? "approved" : "pending",
        publication_status: wasApproved ? events[0].publication_status : "draft",
        start_date,
        end_date,
      }),
      sales_start_at: salesWindow.salesStart ?? events[0].sales_start_at ?? null,
      sales_end_at: salesWindow.salesEnd ?? events[0].sales_end_at ?? null,
    });
  } catch (error) {
    await rollbackIfNeeded(connection, transactionStarted);

    deleteUploadedFile(req);

    console.error("Update event error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui konser",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ======================================================
// ORGANIZER: DELETE EVENT
// ======================================================

async function deleteEvent(req, res) {
  let connection;

  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    const [events] = await connection.execute(
      `SELECT
        id,
        status,
        approval_status,
        poster_url
       FROM events
       WHERE id = ?
         AND organizer_id = ?
       FOR UPDATE`,
      [id, req.user.id]
    );

    if (!events.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    // Soft-delete agar riwayat order/tiket tetap utuh, tetapi konser
    // langsung hilang dari katalog Customer dan daftar Organizer.
    await connection.execute(
      `UPDATE events
       SET deleted_at = CURRENT_TIMESTAMP,
           publication_status = 'unpublished',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND organizer_id = ?
         AND deleted_at IS NULL`,
      [id, req.user.id]
    );

    await connection.commit();

    return res.json({
      message: "Konser berhasil dihapus",
      event_id: Number(id),
      archived: true,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Delete event error:", error);

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message:
          "Konser tidak dapat dihapus karena sudah memiliki data tiket atau transaksi",
      });
    }

    return res.status(500).json({
      message: "Gagal menghapus konser",
    });
  } finally {
    if (connection) connection.release();
  }
}

// ======================================================
// SUPER ADMIN: GET PENDING EVENTS
// ======================================================

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
         e.approval_status,
         e.publication_status,
         e.sales_start_at,
         e.sales_end_at,
         e.created_at,
         e.rejection_reason,

         c.id AS category_id,
         c.name AS category_name,

         v.id AS venue_id,
         v.name AS venue_name,
         v.address AS venue_address,

         u.id AS organizer_id,
         u.name AS organizer_name

       FROM events e

       JOIN categories c
         ON c.id = e.category_id

       JOIN venues v
         ON v.id = e.venue_id

       JOIN users u
         ON u.id = e.organizer_id

       WHERE e.approval_status IN (
         'pending',
         'revision_required'
       )

       ORDER BY e.created_at ASC`
    );

    await attachEventDetails(events);

    return res.json({
      message:
        "Daftar konser yang membutuhkan pemeriksaan berhasil diambil",
      total: events.length,
      events,
    });
  } catch (error) {
    console.error("Get pending events error:", error);

    return res.status(500).json({
      message: "Gagal mengambil daftar konser pending",
    });
  }
}

// ======================================================
// SUPER ADMIN: APPROVE EVENT
// ======================================================

async function approveEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT
        id,
        name,
        organizer_id,
        approval_status,
        status
       FROM events
       WHERE id = ?`,
      [id]
    );

    if (!events.length) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    const currentApproval =
      events[0].approval_status || events[0].status;

    if (
      !["pending", "revision_required"].includes(currentApproval)
    ) {
      return res.status(400).json({
        message:
          "Hanya konser pending atau revision_required yang dapat disetujui",
      });
    }

    await db.execute(
      `UPDATE events
       SET
         status = 'published',
         approval_status = 'approved',
         publication_status = 'draft',
         approved_by = ?,
         approved_at = CURRENT_TIMESTAMP,
         rejection_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, id]
    );

    try {
      await createNotification({
        userId: events[0].organizer_id,
        eventId: id,
        title: "Concert Approved",
        message: `${events[0].name} has been approved. You can now publish it when ticket categories and sales schedule are ready.`,
        type: "concert_approval",
      });
    } catch (notificationError) {
      console.error("Approve concert notification error:", notificationError.message);
    }

    return res.json({
      message:
        "Konser disetujui. Event Organizer dapat memublikasikannya setelah melengkapi kategori tiket dan jadwal penjualan.",

      event_id: Number(id),
      status: "published",
      approval_status: "approved",
      publication_status: "draft",
    });
  } catch (error) {
    console.error("Approve event error:", error);

    return res.status(500).json({
      message: "Gagal menyetujui konser",
    });
  }
}

// ======================================================
// SUPER ADMIN: REJECT EVENT
// ======================================================

async function rejectEvent(req, res) {
  try {
    const { id } = req.params;

    const rejectionReason = cleanString(
      req.body?.rejection_reason
    );

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        message: "Alasan penolakan wajib diisi",
      });
    }

    const [events] = await db.execute(
      `SELECT
        id,
        name,
        organizer_id,
        approval_status,
        status
       FROM events
       WHERE id = ?`,
      [id]
    );

    if (!events.length) {
      return res.status(404).json({
        message: "Konser tidak ditemukan",
      });
    }

    const currentApproval =
      events[0].approval_status || events[0].status;

    if (
      !["pending", "revision_required"].includes(currentApproval)
    ) {
      return res.status(400).json({
        message:
          "Hanya konser pending atau revision_required yang dapat ditolak",
      });
    }

    await db.execute(
      `UPDATE events
       SET
         status = 'rejected',
         approval_status = 'rejected',
         publication_status = 'draft',
         rejection_reason = ?,
         approved_by = NULL,
         approved_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [rejectionReason, id]
    );

    try {
      await createNotification({
        userId: events[0].organizer_id,
        eventId: id,
        title: "Concert Rejected",
        message: `${events[0].name} was rejected. Reason: ${rejectionReason}`,
        type: "concert_rejection",
      });
    } catch (notificationError) {
      console.error("Reject concert notification error:", notificationError.message);
    }

    return res.json({
      message: "Konser berhasil ditolak",
      event_id: Number(id),
      status: "rejected",
      approval_status: "rejected",
      publication_status: "draft",
      rejection_reason: rejectionReason,
    });
  } catch (error) {
    console.error("Reject event error:", error);

    return res.status(500).json({
      message: "Gagal menolak konser",
    });
  }
}

// ======================================================
// ORGANIZER: PUBLISH EVENT
// ======================================================

async function publishEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT
         id,
         approval_status,
         publication_status,
         sales_start_at,
         sales_end_at,
         end_date
       FROM events
       WHERE id = ?
         AND organizer_id = ?`,
      [id, req.user.id]
    );

    if (!events.length) {
      return res.status(404).json({
        message: "Konser tidak ditemukan atau bukan milik kamu",
      });
    }

    const event = events[0];

    if (event.approval_status !== "approved") {
      return res.status(400).json({
        message:
          "Konser harus disetujui Super Admin sebelum dipublikasikan",
      });
    }

    if (event.publication_status === "published") {
      return res.status(409).json({
        message: "Konser sudah dipublikasikan",
      });
    }

    const salesStart = parseDate(event.sales_start_at);

    const salesEnd = event.sales_end_at
      ? parseDate(event.sales_end_at)
      : null;

    if (
      !salesStart ||
      (event.sales_end_at && !salesEnd) ||
      (salesEnd && salesEnd <= salesStart)
    ) {
      return res.status(400).json({
        message:
          "Atur jadwal mulai dan selesai penjualan tiket sebelum memublikasikan konser",
      });
    }

    const eventEnd = parseDate(event.end_date);

    if (!eventEnd || eventEnd <= new Date()) {
      return res.status(400).json({
        message:
          "Konser yang sudah berakhir tidak dapat dipublikasikan",
      });
    }

    const [ticketCategories] = await db.execute(
      `SELECT id
       FROM ticket_categories
       WHERE event_id = ?
       LIMIT 1`,
      [id]
    );

    if (!ticketCategories.length) {
      return res.status(400).json({
        message:
          "Tambahkan minimal satu kategori tiket sebelum memublikasikan konser",
      });
    }

    await db.execute(
      `UPDATE events
       SET
         publication_status = 'published',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND organizer_id = ?
         AND approval_status = 'approved'`,
      [id, req.user.id]
    );

    return res.json({
      message: "Konser berhasil dipublikasikan",
      event_id: Number(id),
      approval_status: "approved",
      publication_status: "published",
    });
  } catch (error) {
    console.error("Publish event error:", error);

    return res.status(500).json({
      message: "Gagal memublikasikan konser",
    });
  }
}

// ======================================================
// ORGANIZER: MOVE EVENT TO DRAFT
// ======================================================

async function moveEventToDraft(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "ID konser tidak valid" });
    }

    const [result] = await db.execute(
      `UPDATE events
       SET publication_status = 'unpublished',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND organizer_id = ?
         AND approval_status = 'approved'
         AND publication_status = 'published'
         AND deleted_at IS NULL`,
      [id, req.user.id]
    );

    if (!result.affectedRows) {
      return res.status(409).json({
        message: "Only published and approved concerts can be moved to Draft.",
      });
    }

    return res.json({
      message: "Concert moved to Draft successfully.",
      event_id: Number(id),
      publication_status: "unpublished",
      display_status: "Draft",
    });
  } catch (error) {
    console.error("Move event to draft error:", error);
    return res.status(500).json({ message: "Failed to move concert to Draft." });
  }
}

// ======================================================
// ORGANIZER: UNPUBLISH EVENT
// ======================================================

async function unpublishEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "ID konser tidak valid",
      });
    }

    const [result] = await db.execute(
      `UPDATE events
       SET
         publication_status = 'unpublished',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND organizer_id = ?
         AND approval_status = 'approved'
         AND publication_status = 'published'`,
      [id, req.user.id]
    );

    if (!result.affectedRows) {
      const [events] = await db.execute(
        `SELECT id
         FROM events
         WHERE id = ?
           AND organizer_id = ?`,
        [id, req.user.id]
      );

      if (!events.length) {
        return res.status(404).json({
          message: "Konser tidak ditemukan atau bukan milik kamu",
        });
      }

      return res.status(400).json({
        message:
          "Hanya konser yang sudah dipublikasikan dan disetujui yang dapat dibatalkan publikasinya",
      });
    }

    return res.json({
      message: "Publikasi konser berhasil dibatalkan",
      event_id: Number(id),
      approval_status: "approved",
      publication_status: "unpublished",
    });
  } catch (error) {
    console.error("Unpublish event error:", error);

    return res.status(500).json({
      message: "Gagal membatalkan publikasi konser",
    });
  }
}

// ======================================================
// TEMPEL DI BAWAH eventsController.js (sebelum module.exports)
// lalu tambahkan getOrganizerDashboard dan getOrganizerConcerts
// ke dalam module.exports. `db` sudah di-require di file itu.
// ======================================================

// ======================================================
// HELPERS
// ======================================================

// Waktu pembayaran: pakai settled_at dari Midtrans, fallback ke updated_at order.
const PAID_AT = "COALESCE(p.settled_at, o.updated_at)";

// Semua item order yang sudah dibayar untuk konser milik 1 organizer.
const PAID_FROM = `
  FROM order_items oi
  JOIN orders o
    ON o.id = oi.order_id AND o.status = 'paid'
  JOIN ticket_categories tc
    ON tc.id = oi.ticket_category_id
  JOIN events e
    ON e.id = tc.event_id
  LEFT JOIN payments p
    ON p.order_id = o.id
  WHERE e.organizer_id = ?`;

const CHECKIN_FROM = `
  FROM check_ins ci
  JOIN tickets t ON t.id = ci.ticket_id
  JOIN order_items oi ON oi.id = t.order_item_id
  JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
  JOIN events e ON e.id = tc.event_id`;

const RANGES = {
  day: { unit: "hour", count: 24 },
  week: { unit: "day", count: 7 },
  month: { unit: "day", count: 30 },
  year: { unit: "month", count: 12 },
};

async function query(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function bucketKey(date, unit) {
  const month = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  if (unit === "month") return month;

  const day = `${month}-${pad(date.getDate())}`;
  return unit === "day" ? day : `${day} ${pad(date.getHours())}`;
}

function bucketLabel(date, unit) {
  if (unit === "hour") return `${pad(date.getHours())}:00`;
  if (unit === "month") {
    return date.toLocaleDateString("en-GB", { month: "short" });
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function buildBuckets(range) {
  const { unit, count } = RANGES[range];
  const now = new Date();
  const buckets = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);

    if (unit === "hour") {
      d.setMinutes(0, 0, 0);
      d.setHours(now.getHours() - i);
    } else if (unit === "day") {
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - i);
    } else {
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      d.setMonth(now.getMonth() - i);
    }

    buckets.push({
      date: d,
      key: bucketKey(d, unit),
      label: bucketLabel(d, unit),
    });
  }

  return buckets;
}

function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function paymentLabel(type, bank) {
  if (type === "bank_transfer") {
    return bank ? `${String(bank).toUpperCase()} Virtual Account` : "Bank Transfer";
  }

  const labels = {
    echannel: "Mandiri Bill",
    gopay: "GoPay",
    qris: "QRIS",
    credit_card: "Credit Card",
    shopeepay: "ShopeePay",
    cstore: "Convenience Store",
    akulaku: "Akulaku",
  };

  return labels[type] || type;
}

// Status yang ditampilkan di UI organizer.
function getDisplayStatus(row) {
  const now = Date.now();

  if (row.approval_status === "rejected") return "Rejected";
  if (row.approval_status === "revision_required") return "Revision";
  if (row.approval_status !== "approved") return "Pending";
  if (row.publication_status !== "published") return "Draft";

  const start = parseDate(row.start_date)?.getTime();
  const end = parseDate(row.end_date)?.getTime();

  if (end && now >= end) return "Completed";
  if (start && now >= start) return "Ongoing";
  return "Published";
}

// Daftar konser organizer lengkap dengan tiket terjual, kuota, dan revenue.
async function fetchConcertRows(organizerId, limit) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));

  const rows = await query(
    `SELECT
       e.id,
       e.name,
       e.description,
       e.category_id,
       e.venue_id,
       e.poster_url,
       e.start_date,
       e.end_date,
       e.sales_start_at,
       e.sales_end_at,
       e.approval_status,
       e.publication_status,
       v.name AS venue_name,
       v.address AS venue_address,
       v.latitude,
       v.longitude,
       c.name AS category_name,
       COALESCE(q.quota, 0) AS quota,
       COALESCE(s.sold, 0) AS sold,
       COALESCE(s.revenue, 0) AS revenue
     FROM events e
     JOIN venues v ON v.id = e.venue_id
     JOIN categories c ON c.id = e.category_id
     LEFT JOIN (
       SELECT event_id, SUM(quota) AS quota
       FROM ticket_categories
       GROUP BY event_id
     ) q ON q.event_id = e.id
     LEFT JOIN (
       SELECT
         tc.event_id,
         SUM(oi.quantity) AS sold,
         SUM(oi.subtotal) AS revenue
       FROM order_items oi
       JOIN orders o
         ON o.id = oi.order_id AND o.status = 'paid'
       JOIN ticket_categories tc
         ON tc.id = oi.ticket_category_id
       GROUP BY tc.event_id
     ) s ON s.event_id = e.id
     WHERE e.organizer_id = ?
       AND e.deleted_at IS NULL
     ORDER BY e.created_at DESC
     LIMIT ${safeLimit}`,
    [organizerId]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    category_id: row.category_id,
    category_name: row.category_name,
    venue_id: row.venue_id,
    venue_name: row.venue_name,
    venue_address: row.venue_address,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    poster_url: row.poster_url,
    start_date: row.start_date,
    end_date: row.end_date,
    sales_start_at: row.sales_start_at,
    sales_end_at: row.sales_end_at,
    quota: Number(row.quota),
    sold: Number(row.sold),
    revenue: Number(row.revenue),
    approval_status: row.approval_status,
    publication_status: row.publication_status,
    display_status: getDisplayStatus(row),
  }));
}

async function fetchRecentActivity(organizerId) {
  const [orders, checkIns, approvals] = await Promise.all([
    query(
      `SELECT
         o.order_code,
         ${PAID_AT} AS at,
         SUM(oi.quantity) AS qty,
         MIN(e.name) AS event_name
       ${PAID_FROM}
       GROUP BY o.id, o.order_code, p.settled_at, o.updated_at
       ORDER BY at DESC
       LIMIT 6`,
      [organizerId]
    ),
    query(
      `SELECT
         t.ticket_code,
         ci.checked_at AS at,
         e.name AS event_name
       ${CHECKIN_FROM}
       WHERE e.organizer_id = ?
       ORDER BY ci.checked_at DESC
       LIMIT 6`,
      [organizerId]
    ),
    query(
      `SELECT name AS event_name, approval_status, updated_at AS at
       FROM events
       WHERE organizer_id = ?
         AND approval_status IN ('approved', 'rejected')
       ORDER BY updated_at DESC
       LIMIT 4`,
      [organizerId]
    ),
  ]);

  const items = [
    ...orders.map((r) => ({
      type: "order",
      title: "New Order",
      description: `${r.order_code} · ${Number(r.qty)} tiket · ${r.event_name}`,
      at: r.at,
    })),
    ...checkIns.map((r) => ({
      type: "check_in",
      title: "Check-in Successful",
      description: `${r.ticket_code} · ${r.event_name}`,
      at: r.at,
    })),
    ...approvals.map((r) => ({
      type: r.approval_status === "approved" ? "approved" : "rejected",
      title:
        r.approval_status === "approved"
          ? "Concert Approved"
          : "Concert Rejected",
      description: r.event_name,
      at: r.at,
    })),
  ];

  return items
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)
    .map((item) => ({ ...item, at: new Date(item.at).toISOString() }));
}

// ======================================================
// GET /api/events/organizer/dashboard?range=day|week|month|year
// ======================================================

async function getOrganizerDashboard(req, res) {
  try {
    const organizerId = req.user?.id;

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const range = RANGES[req.query.range] ? req.query.range : "week";
    const buckets = buildBuckets(range);
    const start = buckets[0].date;
    const prevStart = new Date(start.getTime() - (Date.now() - start.getTime()));
    const { unit } = RANGES[range];
    const dateFormat =
      unit === "month" ? "%Y-%m" : unit === "day" ? "%Y-%m-%d" : "%Y-%m-%d %H";

    const [
      eventRows,
      salesRows,
      checkInRows,
      trendRows,
      periodRows,
      upcomingRows,
      paymentRows,
      concerts,
      recentActivity,
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(
             approval_status = 'approved'
             AND publication_status = 'published'
             AND start_date <= NOW()
             AND end_date >= NOW()
           ), 0) AS active
         FROM events
         WHERE organizer_id = ?`,
        [organizerId]
      ),

      query(
        `SELECT
           COALESCE(SUM(oi.quantity), 0) AS tickets_sold,
           COALESCE(SUM(oi.subtotal), 0) AS revenue
         ${PAID_FROM}`,
        [organizerId]
      ),

      query(
        `SELECT COUNT(*) AS total
         ${CHECKIN_FROM}
         WHERE e.organizer_id = ?`,
        [organizerId]
      ),

      query(
        `SELECT
           DATE_FORMAT(${PAID_AT}, '${dateFormat}') AS bucket,
           SUM(oi.quantity) AS tickets,
           SUM(oi.subtotal) AS revenue
         ${PAID_FROM}
           AND ${PAID_AT} >= ?
         GROUP BY bucket`,
        [organizerId, start]
      ),

      query(
        `SELECT
           COALESCE(SUM(CASE WHEN ${PAID_AT} >= ? THEN oi.quantity END), 0) AS cur_tickets,
           COALESCE(SUM(CASE WHEN ${PAID_AT} >= ? THEN oi.subtotal END), 0) AS cur_revenue,
           COALESCE(SUM(CASE WHEN ${PAID_AT} < ? THEN oi.quantity END), 0) AS prev_tickets,
           COALESCE(SUM(CASE WHEN ${PAID_AT} < ? THEN oi.subtotal END), 0) AS prev_revenue
         ${PAID_FROM}
           AND ${PAID_AT} >= ?`,
        [start, start, start, start, organizerId, prevStart]
      ),

      query(
        `SELECT
           e.id,
           e.name,
           e.poster_url,
           e.start_date,
           v.name AS venue_name,
           v.address AS venue_address,
           c.name AS category_name,
           (
             SELECT GROUP_CONCAT(a.name SEPARATOR ', ')
             FROM event_artists ea
             JOIN artists a ON a.id = ea.artist_id
             WHERE ea.event_id = e.id
           ) AS artists,
           (
             SELECT COALESCE(SUM(quota), 0)
             FROM ticket_categories
             WHERE event_id = e.id
           ) AS quota,
           (
             SELECT COALESCE(SUM(oi.quantity), 0)
             FROM order_items oi
             JOIN orders o
               ON o.id = oi.order_id AND o.status = 'paid'
             JOIN ticket_categories tc
               ON tc.id = oi.ticket_category_id
             WHERE tc.event_id = e.id
           ) AS sold
         FROM events e
         JOIN venues v ON v.id = e.venue_id
         JOIN categories c ON c.id = e.category_id
         WHERE e.organizer_id = ?
           AND e.approval_status = 'approved'
           AND e.publication_status = 'published'
           AND e.start_date > NOW()
         ORDER BY e.start_date ASC
         LIMIT 1`,
        [organizerId]
      ),

      query(
        `SELECT
           p.payment_type,
           JSON_UNQUOTE(JSON_EXTRACT(p.midtrans_response, '$.va_numbers[0].bank')) AS bank,
           COUNT(DISTINCT o.id) AS total
         FROM orders o
         JOIN payments p ON p.order_id = o.id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
         JOIN events e ON e.id = tc.event_id
         WHERE e.organizer_id = ?
           AND o.status = 'paid'
           AND p.payment_type IS NOT NULL
         GROUP BY p.payment_type, bank
         ORDER BY total DESC`,
        [organizerId]
      ),

      fetchConcertRows(organizerId, 50),
      fetchRecentActivity(organizerId),
    ]);

    // ---- Stats ----
    const ticketsSold = Number(salesRows[0].tickets_sold);
    const grossRevenue = Number(salesRows[0].revenue);
    const checkedIn = Number(checkInRows[0].total);
    const period = periodRows[0];

    // ---- Trend (isi bucket kosong dengan 0) ----
    const trendMap = new Map(
      trendRows.map((r) => [
        r.bucket,
        { tickets: Number(r.tickets), revenue: Number(r.revenue) },
      ])
    );

    const trend = buckets.map((b) => ({
      label: b.label,
      tickets: trendMap.get(b.key)?.tickets ?? 0,
      revenue: trendMap.get(b.key)?.revenue ?? 0,
    }));

    // ---- Upcoming ----
    const up = upcomingRows[0];
    const upcoming = up
      ? {
          id: up.id,
          name: up.name,
          poster_url: up.poster_url,
          start_date: up.start_date,
          venue_name: up.venue_name,
          venue_address: up.venue_address,
          category_name: up.category_name,
          artists: up.artists || "",
          quota: Number(up.quota),
          sold: Number(up.sold),
        }
      : null;

    // ---- Payment methods ----
    const paymentTotal = paymentRows.reduce((sum, r) => sum + Number(r.total), 0);
    const paymentMethods = paymentRows.map((r) => ({
      label: paymentLabel(r.payment_type, r.bank),
      count: Number(r.total),
      percent: paymentTotal
        ? Math.round((Number(r.total) / paymentTotal) * 1000) / 10
        : 0,
    }));

    return res.status(200).json({
      success: true,
      range,
      stats: {
        total_concerts: Number(eventRows[0].total),
        active_concerts: Number(eventRows[0].active),
        tickets_sold: ticketsSold,
        tickets_checked_in: checkedIn,
        gross_revenue: grossRevenue,
        tickets_sold_change: percentChange(
          Number(period.cur_tickets),
          Number(period.prev_tickets)
        ),
        revenue_change: percentChange(
          Number(period.cur_revenue),
          Number(period.prev_revenue)
        ),
      },
      trend,
      attendance: {
        checked_in: checkedIn,
        not_checked_in: Math.max(ticketsSold - checkedIn, 0),
        total: ticketsSold,
        rate: ticketsSold
          ? Math.round((checkedIn / ticketsSold) * 1000) / 10
          : 0,
      },
      upcoming,
      recent_activity: recentActivity,
      concerts,
      payment_methods: paymentMethods,
      // Belum ada tabel withdraw/payout, jadi saldo = total revenue yang sudah dibayar.
      balance: { available: grossRevenue },
    });
  } catch (error) {
    console.error("Get organizer dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard",
    });
  }
}

// ======================================================
// GET /api/events/organizer/concerts
// ======================================================

async function getOrganizerConcerts(req, res) {
  try {
    const organizerId = req.user?.id;

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const concerts = await fetchConcertRows(organizerId, 500);

    return res.status(200).json({
      success: true,
      total: concerts.length,
      concerts,
    });
  } catch (error) {
    console.error("Get organizer concerts error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar konser",
    });
  }
}

// ======================================================
// ORGANIZER: CREATE CONCERT FORM OPTIONS
// GET /api/events/organizer/create-options
// ======================================================

async function getOrganizerCreateOptions(req, res) {
  try {
    const [categories] = await db.execute(
      "SELECT id, name FROM categories WHERE status = 'active' ORDER BY name ASC"
    );

    const [venues] = await db.execute(
      `SELECT id, name, address, latitude, longitude
       FROM venues
       ORDER BY name ASC`
    );

    return res.status(200).json({ success: true, categories, venues });
  } catch (error) {
    console.error("Get organizer create options error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pilihan kategori dan venue",
    });
  }
}

// ======================================================
// EXPORT
// ======================================================

// ======================================================
// SUPER ADMIN DASHBOARD
// GET /api/events/admin/dashboard?range=day|week|month|year
// Memakai helper yang sudah ada di atas: query, PAID_AT, RANGES,
// buildBuckets, percentChange.
// ======================================================

// Semua item order yang sudah dibayar (seluruh platform).
const ADMIN_PAID_FROM = `
  FROM order_items oi
  JOIN orders o
    ON o.id = oi.order_id AND o.status = 'paid'
  LEFT JOIN payments p
    ON p.order_id = o.id
  WHERE 1 = 1`;


// Status yang ditampilkan di UI super admin.
function getAdminDisplayStatus(row) {
  const now = Date.now();

  if (row.approval_status === "rejected") return "Rejected";
  if (row.approval_status === "revision_required") return "Revision";
  if (row.approval_status !== "approved") return "Pending";

  if (row.publication_status !== "published") return "Draft";

  const start = parseDate(row.start_date)?.getTime();
  const end = parseDate(row.end_date)?.getTime();
  if (end && now >= end) return "Completed";
  if (start && now >= start) return "Ongoing";
  return "Published";
}

// Konser terbaru dari semua organizer. Yang butuh tindakan (pending / revisi) ditaruh di atas.
async function fetchAdminRecentConcerts(limit = 30) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));

  const rows = await query(
    `SELECT
       e.id,
       e.name,
       e.poster_url,
       e.start_date,
       e.end_date,
       e.approval_status,
       e.publication_status,
       e.created_at,
       u.name AS organizer_name,
       v.name AS venue_name,
       c.name AS category_name
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     JOIN venues v ON v.id = e.venue_id
     JOIN categories c ON c.id = e.category_id
     ORDER BY
       (e.approval_status IN ('pending', 'revision_required')) DESC,
       e.created_at DESC
     LIMIT ${safeLimit}`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    poster_url: row.poster_url,
    start_date: row.start_date,
    end_date: row.end_date,
    organizer_name: row.organizer_name,
    venue_name: row.venue_name,
    category_name: row.category_name,
    approval_status: row.approval_status,
    publication_status: row.publication_status,
    display_status: getAdminDisplayStatus(row),
    created_at: row.created_at,
  }));
}

// Aktivitas terbaru di seluruh platform.
async function fetchAdminRecentActivity() {
  const [organizers, submissions, orders, decisions] = await Promise.all([
    query(
      `SELECT name, created_at AS at
       FROM users
       WHERE role = 'organizer'
       ORDER BY created_at DESC
       LIMIT 5`
    ),
    query(
      `SELECT e.name AS event_name, u.name AS organizer_name, e.created_at AS at
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       WHERE e.approval_status IN ('pending', 'revision_required')
       ORDER BY e.created_at DESC
       LIMIT 5`
    ),
    query(
      `SELECT
         o.order_code,
         ${PAID_AT} AS at,
         SUM(oi.quantity) AS qty,
         MIN(e.name) AS event_name
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
       JOIN events e ON e.id = tc.event_id
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.status = 'paid'
       GROUP BY o.id, o.order_code, p.settled_at, o.updated_at
       ORDER BY at DESC
       LIMIT 5`
    ),
    query(
      `SELECT name AS event_name, approval_status, updated_at AS at
       FROM events
       WHERE approval_status IN ('approved', 'rejected')
       ORDER BY updated_at DESC
       LIMIT 4`
    ),
  ]);

  const items = [
    ...organizers.map((r) => ({
      type: "organizer",
      title: "New organizer registered",
      description: r.name,
      at: r.at,
    })),
    ...submissions.map((r) => ({
      type: "submission",
      title: "Concert submitted for approval",
      description: `${r.event_name} · ${r.organizer_name}`,
      at: r.at,
    })),
    ...orders.map((r) => ({
      type: "order",
      title: "New order",
      description: `${r.order_code} · ${Number(r.qty)} tickets · ${r.event_name}`,
      at: r.at,
    })),
    ...decisions.map((r) => ({
      type: r.approval_status === "approved" ? "approved" : "rejected",
      title:
        r.approval_status === "approved"
          ? "Concert approved"
          : "Concert rejected",
      description: r.event_name,
      at: r.at,
    })),
  ];

  return items
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);
}

// ======================================================
// GET /api/admin/dashboard?range=day|week|month|year
// ======================================================

async function getAdminDashboard(req, res) {
  try {
    const range = RANGES[req.query.range] ? req.query.range : "week";
    const buckets = buildBuckets(range);
    const start = buckets[0].date;
    const prevStart = new Date(start.getTime() - (Date.now() - start.getTime()));
    const { unit } = RANGES[range];
    const dateFormat =
      unit === "month" ? "%Y-%m" : unit === "day" ? "%Y-%m-%d" : "%Y-%m-%d %H";

    const [
      userRows,
      userPeriodRows,
      eventRows,
      eventPeriodRows,
      salesRows,
      salesPeriodRows,
      checkInRows,
      trendRows,
      concerts,
      recentActivity,
    ] = await Promise.all([
      // Total akun per role
      query(
        `SELECT
           COALESCE(SUM(role = 'customer'), 0) AS customers,
           COALESCE(SUM(role = 'organizer'), 0) AS organizers,
           COALESCE(SUM(role = 'customer' AND is_active = 1), 0) AS active_customers
         FROM users`
      ),

      // Akun baru: periode ini vs periode sebelumnya
      query(
        `SELECT
           COALESCE(SUM(role = 'customer' AND created_at >= ?), 0) AS cur_customers,
           COALESCE(SUM(role = 'customer' AND created_at < ?), 0) AS prev_customers,
           COALESCE(SUM(role = 'organizer' AND created_at >= ?), 0) AS cur_organizers,
           COALESCE(SUM(role = 'organizer' AND created_at < ?), 0) AS prev_organizers
         FROM users
         WHERE created_at >= ?`,
        [start, start, start, start, prevStart]
      ),

      // Total konser + yang menunggu persetujuan
      query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(approval_status IN ('pending', 'revision_required')), 0) AS pending
         FROM events`
      ),

      query(
        `SELECT
           COALESCE(SUM(created_at >= ?), 0) AS cur_events,
           COALESCE(SUM(created_at < ?), 0) AS prev_events
         FROM events
         WHERE created_at >= ?`,
        [start, start, prevStart]
      ),

      // Tiket terjual & revenue (seluruh platform, order paid)
      query(
        `SELECT
           COALESCE(SUM(oi.quantity), 0) AS tickets_sold,
           COALESCE(SUM(oi.subtotal), 0) AS revenue
         ${ADMIN_PAID_FROM}`
      ),

      query(
        `SELECT
           COALESCE(SUM(CASE WHEN ${PAID_AT} >= ? THEN oi.quantity END), 0) AS cur_tickets,
           COALESCE(SUM(CASE WHEN ${PAID_AT} >= ? THEN oi.subtotal END), 0) AS cur_revenue,
           COALESCE(SUM(CASE WHEN ${PAID_AT} < ? THEN oi.quantity END), 0) AS prev_tickets,
           COALESCE(SUM(CASE WHEN ${PAID_AT} < ? THEN oi.subtotal END), 0) AS prev_revenue
         ${ADMIN_PAID_FROM}
           AND ${PAID_AT} >= ?`,
        [start, start, start, start, prevStart]
      ),

      query(`SELECT COUNT(*) AS total FROM check_ins`),

      // Tren penjualan per bucket
      query(
        `SELECT
           DATE_FORMAT(${PAID_AT}, '${dateFormat}') AS bucket,
           SUM(oi.quantity) AS tickets,
           SUM(oi.subtotal) AS revenue
         ${ADMIN_PAID_FROM}
           AND ${PAID_AT} >= ?
         GROUP BY bucket`,
        [start]
      ),

      fetchAdminRecentConcerts(30),
      fetchAdminRecentActivity(),
    ]);

    const customers = Number(userRows[0].customers);
    const organizers = Number(userRows[0].organizers);
    const activeCustomers = Number(userRows[0].active_customers);
    const userPeriod = userPeriodRows[0];
    const eventPeriod = eventPeriodRows[0];
    const salesPeriod = salesPeriodRows[0];

    const ticketsSold = Number(salesRows[0].tickets_sold);
    const grossRevenue = Number(salesRows[0].revenue);
    const checkedIn = Number(checkInRows[0].total);

    // Trend: isi bucket kosong dengan 0
    const trendMap = new Map(
      trendRows.map((r) => [
        r.bucket,
        { tickets: Number(r.tickets), revenue: Number(r.revenue) },
      ])
    );

    const trend = buckets.map((b) => ({
      label: b.label,
      tickets: trendMap.get(b.key)?.tickets ?? 0,
      revenue: trendMap.get(b.key)?.revenue ?? 0,
    }));

    return res.status(200).json({
      success: true,
      range,
      stats: {
        total_users: customers,
        active_users: activeCustomers,
        active_user_percent: customers
          ? Math.round((activeCustomers / customers) * 1000) / 10
          : 0,
        total_organizers: organizers,
        total_concerts: Number(eventRows[0].total),
        pending_concerts: Number(eventRows[0].pending),
        tickets_sold: ticketsSold,
        gross_revenue: grossRevenue,

        users_change: percentChange(
          Number(userPeriod.cur_customers),
          Number(userPeriod.prev_customers)
        ),
        organizers_change: percentChange(
          Number(userPeriod.cur_organizers),
          Number(userPeriod.prev_organizers)
        ),
        concerts_change: percentChange(
          Number(eventPeriod.cur_events),
          Number(eventPeriod.prev_events)
        ),
        tickets_sold_change: percentChange(
          Number(salesPeriod.cur_tickets),
          Number(salesPeriod.prev_tickets)
        ),
        revenue_change: percentChange(
          Number(salesPeriod.cur_revenue),
          Number(salesPeriod.prev_revenue)
        ),
      },
      trend,
      attendance: {
        checked_in: checkedIn,
        not_checked_in: Math.max(ticketsSold - checkedIn, 0),
        total: ticketsSold,
        rate: ticketsSold
          ? Math.round((checkedIn / ticketsSold) * 1000) / 10
          : 0,
      },
      concerts,
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard admin",
    });
  }
}



// ======================================================
// SUPER ADMIN: MANAGE CONCERTS
// GET /api/events/admin/concerts
// ======================================================
async function getAdminConcerts(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT
         e.id, e.name, e.poster_url, e.start_date, e.end_date,
         e.status, e.approval_status, e.publication_status,
         v.name AS venue_name, v.address AS venue_address,
         c.name AS category_name, u.name AS organizer_name,
         COALESCE(q.quota, 0) AS quota,
         COALESCE(s.sold, 0) AS sold,
         COALESCE(s.revenue, 0) AS revenue
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       JOIN categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.organizer_id
       LEFT JOIN (
         SELECT event_id, SUM(quota) AS quota
         FROM ticket_categories GROUP BY event_id
       ) q ON q.event_id = e.id
       LEFT JOIN (
         SELECT tc.event_id, SUM(oi.quantity) AS sold, SUM(oi.subtotal) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
         JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
         GROUP BY tc.event_id
       ) s ON s.event_id = e.id
       WHERE e.deleted_at IS NULL
       ORDER BY
         (e.approval_status IN ('pending', 'revision_required')) DESC,
         e.created_at DESC`
    );

    const now = Date.now();
    const concerts = rows.map((row) => {
      let displayStatus;
      if (row.status === "cancelled") displayStatus = "Cancelled";
      else if (row.approval_status === "rejected") displayStatus = "Rejected";
      else if (row.approval_status === "revision_required") displayStatus = "Revision";
      else if (row.approval_status !== "approved") displayStatus = "Pending";
      else if (row.publication_status !== "published") displayStatus = "Draft";
      else if (new Date(row.end_date).getTime() < now) displayStatus = "Completed";
      else if (new Date(row.start_date).getTime() <= now) displayStatus = "Ongoing";
      else displayStatus = "Published";

      return {
        id: Number(row.id), name: row.name, poster_url: row.poster_url,
        start_date: row.start_date, end_date: row.end_date,
        venue_name: row.venue_name, venue_address: row.venue_address,
        category_name: row.category_name, organizer_name: row.organizer_name,
        quota: Number(row.quota || 0), sold: Number(row.sold || 0),
        revenue: Number(row.revenue || 0), status: row.status,
        approval_status: row.approval_status,
        publication_status: row.publication_status,
        display_status: displayStatus,
      };
    });

    const stats = {
      total: concerts.length,
      ongoing: concerts.filter((e) => e.display_status === "Ongoing").length,
      published: concerts.filter((e) => e.display_status === "Published").length,
      draft: concerts.filter((e) => e.display_status === "Draft").length,
      cancelled: concerts.filter((e) => e.display_status === "Cancelled").length,
    };

    return res.json({ success: true, stats, total: concerts.length, concerts });
  } catch (error) {
    console.error("Get admin concerts error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar konser untuk Super Admin",
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
  publishEvent,
  unpublishEvent,
  moveEventToDraft,
  getOrganizerDashboard,
  getOrganizerConcerts,
  getOrganizerCreateOptions,
  getAdminDashboard,
  getAdminConcerts,
};