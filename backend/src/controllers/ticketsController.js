
const db = require("../config/database");

// Get My Tickets milik customer yang sedang login
const getMyTickets = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [tickets] = await db.query(
      `
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
        v.address AS venue_address

      FROM tickets t

      INNER JOIN order_items oi
        ON t.order_item_id = oi.id

      INNER JOIN orders o
        ON oi.order_id = o.id

      INNER JOIN ticket_categories tc
        ON oi.ticket_category_id = tc.id

      INNER JOIN events e
        ON tc.event_id = e.id

      LEFT JOIN venues v
        ON e.venue_id = v.id

      WHERE o.customer_id = ?
        AND o.status = 'paid'

      ORDER BY t.issued_at DESC
      `,
      [customerId]
    );

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

module.exports = {
  getMyTickets,
};
