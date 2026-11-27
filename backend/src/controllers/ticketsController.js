
const db = require("../config/database");

// ==========================================
// CUSTOMER: GET MY TICKETS
// ==========================================
const getMyTickets = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [tickets] = await db.query(`
      SELECT
        t.id AS ticket_id,
        t.ticket_code,
        t.qr_token,
        t.status AS ticket_status,
        t.issued_at,
        o.id AS order_id,
        o.order_code,
        o.status AS order_status,
        oi.quantity,
        oi.price_at_purchase,
        tc.id AS ticket_category_id,
        tc.name AS category_name,
        e.id AS event_id,
        e.name AS event_name,
        e.start_date,
        e.end_date,
        e.poster_url,
        v.name AS venue_name,
        v.address AS venue_address,
        buyer.name AS attendee_name,
        buyer.email AS attendee_email,
        NULL AS attendee_phone
      FROM tickets t
      INNER JOIN order_items oi ON t.order_item_id = oi.id
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN ticket_categories tc ON oi.ticket_category_id = tc.id
      INNER JOIN events e ON tc.event_id = e.id
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN users buyer ON buyer.id = o.customer_id
      WHERE o.customer_id = ?
        AND o.status = 'paid'
      ORDER BY t.issued_at DESC
    `, [customerId]);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil tiket customer",
      data: tickets,
    });

  } catch (error) {
    console.error("Get My Tickets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data tiket",
    });
  }
};


// ==========================================
// ORGANIZER: GET CHECK-IN STATISTICS
// ==========================================
const getOrganizerCheckIns = async (req, res) => {
  try {
    const organizerId = Number(req.user?.id);
    const eventId = Number(req.query.eventId);

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Event ID tidak valid.",
      });
    }

    // Pastikan konser milik organizer yang sedang login.
    const [ownedEvents] = await db.execute(
      `SELECT id FROM events
       WHERE id = ? AND organizer_id = ?
       LIMIT 1`,
      [eventId, organizerId]
    );

    if (!ownedEvents.length) {
      return res.status(404).json({
        success: false,
        message: "Konser tidak ditemukan atau bukan milik organizer ini.",
      });
    }

    // Total tiket dan tiket yang sudah check-in.
    const [[totals]] = await db.execute(`
      SELECT
        COUNT(t.id) AS total_tickets,
        COALESCE(SUM(t.status = 'used'), 0) AS checked_in
      FROM tickets t
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN orders o ON o.id = oi.order_id
        AND o.status = 'paid'
      JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
      WHERE tc.event_id = ?
        AND t.status IN ('valid', 'used')
    `, [eventId]);

    // Recent check-ins.
    // Menggunakan users.name karena database tidak memiliki ticket_attendees.
    const [recent] = await db.execute(`
      SELECT
        t.ticket_code,
        u.name AS attendee_name,
        tc.name AS category_name,
        ci.checked_at
      FROM check_ins ci
      INNER JOIN tickets t ON t.id = ci.ticket_id
      INNER JOIN order_items oi ON oi.id = t.order_item_id
      INNER JOIN orders o ON o.id = oi.order_id
        AND o.status = 'paid'
      INNER JOIN users u ON u.id = o.customer_id
      INNER JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      WHERE tc.event_id = ?
      ORDER BY ci.checked_at DESC
      LIMIT 20
    `, [eventId]);

    const totalTickets = Number(totals.total_tickets || 0);
    const checkedIn = Number(totals.checked_in || 0);

    return res.status(200).json({
      success: true,
      data: {
        total_tickets: totalTickets,
        checked_in: checkedIn,
        remaining: Math.max(0, totalTickets - checkedIn),
        progress: totalTickets
          ? Math.round((checkedIn / totalTickets) * 1000) / 10
          : 0,
        recent,
      },
    });

  } catch (error) {
    console.error("Get Organizer Check-Ins Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data check-in.",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined,
    });
  }
};


// ==========================================
// ORGANIZER: VALIDATE AND CHECK-IN TICKET
// ==========================================
const organizerCheckIn = async (req, res) => {
  let connection;

  try {
    const organizerId = Number(req.user?.id);
    const eventId = Number(req.body?.eventId);

    const ticketInput = String(
      req.body?.ticketCode || req.body?.qrToken || ""
    ).trim();

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !Number.isSafeInteger(eventId) ||
      eventId <= 0 ||
      !ticketInput
    ) {
      return res.status(400).json({
        success: false,
        message: "Event dan kode tiket wajib diisi.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(`
      SELECT
        t.id AS ticket_id,
        t.ticket_code,
        t.qr_token,
        t.status AS ticket_status,
        tc.name AS category_name,
        e.id AS event_id,
        e.name AS event_name,
        e.organizer_id,
        o.status AS order_status,
        u.name AS attendee_name
      FROM tickets t
      INNER JOIN order_items oi ON oi.id = t.order_item_id
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN users u ON u.id = o.customer_id
      INNER JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      INNER JOIN events e ON e.id = tc.event_id
      WHERE t.ticket_code = ? OR t.qr_token = ?
      LIMIT 1
      FOR UPDATE
    `, [ticketInput, ticketInput]);

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Kode tiket tidak ditemukan.",
      });
    }

    const ticket = rows[0];

    if (Number(ticket.event_id) !== eventId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Tiket ini bukan untuk konser yang sedang dipilih.",
      });
    }

    if (Number(ticket.organizer_id) !== organizerId) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses check-in untuk konser ini.",
      });
    }

    if (ticket.order_status !== "paid") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Pembayaran tiket belum berhasil.",
      });
    }

    if (ticket.ticket_status === "used") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Tiket ini sudah pernah digunakan untuk check-in.",
      });
    }

    if (ticket.ticket_status !== "valid") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: `Tiket tidak dapat digunakan. Status: ${ticket.ticket_status}.`,
      });
    }

    const [updateResult] = await connection.execute(
      `UPDATE tickets
       SET status = 'used'
       WHERE id = ? AND status = 'valid'`,
      [ticket.ticket_id]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Tiket sudah diproses atau tidak dapat digunakan.",
      });
    }

    // Simpan riwayat check-in.
    const [checkInResult] = await connection.execute(
      `INSERT INTO check_ins
       (ticket_id, checked_by, checked_at)
       VALUES (?, ?, NOW())`,
      [ticket.ticket_id, organizerId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Tiket valid. Check-in berhasil!",
      ticket: {
        ticket_id: ticket.ticket_id,
        ticket_code: ticket.ticket_code,
        attendee_name: ticket.attendee_name,
        event_id: ticket.event_id,
        event_name: ticket.event_name,
        category_name: ticket.category_name,
        checked_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Organizer Check-In Error:", error);

    return res.status(500).json({
      success: false,
      message: "Check-in gagal diproses. Silakan coba lagi.",
    });

  } finally {
    if (connection) connection.release();
  }
};


// ==========================================
// ORGANIZER: GET ATTENDEES
// ==========================================
const getOrganizerAttendees = async (req, res) => {
  try {
    const organizerId = Number(req.user?.id);
    const rawEventId = req.query.eventId;
    const eventId = rawEventId ? Number(rawEventId) : null;

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      rawEventId &&
      (!Number.isSafeInteger(eventId) || eventId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Event ID tidak valid.",
      });
    }

    const params = [organizerId];
    let eventFilter = "";

    if (eventId) {
      eventFilter = " AND e.id = ?";
      params.push(eventId);
    }

    const [attendees] = await db.execute(`
      SELECT
        t.id AS ticket_id,
        t.ticket_code,
        t.status AS ticket_status,
        t.issued_at,
        u.name AS attendee_name,
        u.email AS attendee_email,
        NULL AS attendee_phone,
        tc.name AS category_name,
        o.order_code,
        e.id AS event_id,
        e.name AS event_name,
        ci.checked_at
      FROM tickets t
      INNER JOIN order_items oi ON oi.id = t.order_item_id
      INNER JOIN orders o ON o.id = oi.order_id
        AND o.status = 'paid'
      INNER JOIN users u ON u.id = o.customer_id
      INNER JOIN ticket_categories tc
        ON tc.id = oi.ticket_category_id
      INNER JOIN events e ON e.id = tc.event_id
      LEFT JOIN check_ins ci ON ci.ticket_id = t.id
      WHERE e.organizer_id = ?
        AND t.status IN ('valid', 'used')
        ${eventFilter}
      ORDER BY t.issued_at DESC, t.id DESC
    `, params);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar attendees.",
      data: attendees,
    });

  } catch (error) {
    console.error("Get Organizer Attendees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar attendees.",
    });
  }
};


module.exports = {
  getMyTickets,
  getOrganizerCheckIns,
  organizerCheckIn,
  getOrganizerAttendees,
};
