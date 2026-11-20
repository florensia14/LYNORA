
const db = require("../config/database");

// POST /api/orders/checkout
async function checkout(req, res) {
  let connection;

  try {
    connection = await db.getConnection();

    const { items } = req.body;
    const customerId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Pilih minimal satu kategori tiket",
      });
    }

    const quantities = new Map();

    for (const item of items) {
      const ticketId = Number(item.ticket_category_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isSafeInteger(ticketId) ||
        ticketId <= 0 ||
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Kategori tiket atau jumlah pembelian tidak valid",
        });
      }

      quantities.set(
        ticketId,
        (quantities.get(ticketId) || 0) + quantity
      );
    }

    await connection.beginTransaction();

    let totalAmount = 0;
    const orderItems = [];

    for (const [ticketId, quantity] of quantities) {
      const [tickets] = await connection.execute(
        `SELECT
          tc.id,
          tc.name,
          tc.price,
          tc.quota,
          e.id AS event_id,
          e.status AS event_status,
          e.start_date
        FROM ticket_categories tc
        JOIN events e ON e.id = tc.event_id
        WHERE tc.id = ?
        FOR UPDATE`,
        [ticketId]
      );

      if (tickets.length === 0) {
        throw new Error("Kategori tiket tidak ditemukan");
      }

      const ticket = tickets[0];

      if (ticket.event_status !== "published") {
        throw new Error("Konser belum tersedia untuk pembelian");
      }

      if (new Date(ticket.start_date) <= new Date()) {
        throw new Error("Konser sudah dimulai");
      }

      const [reserved] = await connection.execute(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS total
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.ticket_category_id = ?
        AND (
          o.status = 'paid'
          OR (
            o.status = 'pending'
            AND o.expires_at > NOW()
          )
        )`,
        [ticketId]
      );

      const remainingQuota =
        Number(ticket.quota) - Number(reserved[0].total);

      if (quantity > remainingQuota) {
        throw new Error(
          `Kuota tiket ${ticket.name} tidak mencukupi`
        );
      }

      const price = Number(ticket.price);
      const subtotal = price * quantity;

      if (!Number.isFinite(subtotal)) {
        throw new Error("Total harga tidak valid");
      }

      totalAmount += subtotal;

      orderItems.push({
        ticketId,
        quantity,
        price,
        subtotal,
      });
    }

    const orderCode =
      `LYN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (order_code, customer_id, total_amount, status, expires_at)
      VALUES (?, ?, ?, 'pending', ?)`,
      [orderCode, customerId, totalAmount, expiresAt]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items
          (order_id, ticket_category_id, quantity, price_at_purchase, subtotal)
        VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.ticketId,
          item.quantity,
          item.price,
          item.subtotal,
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Order berhasil dibuat",
      order: {
        id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        status: "pending",
        expires_at: expiresAt,
        items: orderItems,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Checkout error:", error);

    const clientErrors = [
      "Kategori tiket tidak ditemukan",
      "Konser belum tersedia untuk pembelian",
      "Konser sudah dimulai",
    ];

    if (
      clientErrors.includes(error.message) ||
      error.message.startsWith("Kuota tiket")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal membuat order",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Ambil detail order tanpa menggandakan baris akibat JOIN payments.
    const [orders] = await db.query(
      `
      SELECT
        o.id,
        o.order_code,
        o.total_amount,
        o.status,
        o.created_at,

        COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT e.name
              ORDER BY e.name
              SEPARATOR ', '
            )
            FROM order_items oi
            JOIN ticket_categories tc
              ON tc.id = oi.ticket_category_id
            JOIN events e
              ON e.id = tc.event_id
            WHERE oi.order_id = o.id
          ),
          'Concert'
        ) AS event_name,

        (
          SELECT e.poster_url
          FROM order_items oi
          JOIN ticket_categories tc
            ON tc.id = oi.ticket_category_id
          JOIN events e
            ON e.id = tc.event_id
          WHERE oi.order_id = o.id
          ORDER BY oi.id ASC
          LIMIT 1
        ) AS poster_url,

        (
          SELECT COALESCE(SUM(oi.quantity), 0)
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) AS quantity,

        (
          SELECT p.payment_type
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS payment_method,

        (
          SELECT p.status
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY p.id DESC
          LIMIT 1
        ) AS payment_status

      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      `,
      [customerId]
    );

    // Statistik dihitung langsung dari tabel orders.
    const [summaryRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_orders,

        COALESCE(
          SUM(
            CASE
              WHEN LOWER(TRIM(status)) = 'paid'
              THEN total_amount
              ELSE 0
            END
          ),
          0
        ) AS total_spent,

        COALESCE(
          SUM(
            CASE
              WHEN LOWER(TRIM(status)) = 'paid'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS paid_orders

      FROM orders
      WHERE customer_id = ?
      `,
      [customerId]
    );

    const summary = {
      total_orders: Number(summaryRows[0].total_orders || 0),
      paid_orders: Number(summaryRows[0].paid_orders || 0),
      total_spent: Number(summaryRows[0].total_spent || 0),
    };

    const formattedOrders = orders.map((order) => ({
      id: order.order_code,
      order_id: order.id,
      event_name: order.event_name,
      poster_url: order.poster_url,
      date: order.created_at,
      quantity: Number(order.quantity || 0),
      total: Number(order.total_amount || 0),

      status:
        String(order.status).toLowerCase() === "expired"
          ? "cancelled"
          : order.status,

      method: order.payment_method || "Not available",
      payment_status: order.payment_status || "pending",
    }));

    return res.status(200).json({
      success: true,
      message: "My orders retrieved successfully.",
      summary,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders.",
    });
  }
};


// GET /api/orders/organizer-orders
async function getOrganizerOrders(req, res) {
  try {
    const organizerId = req.user?.id;
    const eventId = req.query.event_id ? Number(req.query.event_id) : null;

    if (!organizerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (eventId !== null && (!Number.isSafeInteger(eventId) || eventId <= 0)) {
      return res.status(400).json({ success: false, message: "ID konser tidak valid." });
    }

    const params = [organizerId];
    let eventFilter = "";
    if (eventId !== null) {
      eventFilter = " AND e.id = ?";
      params.push(eventId);
    }

    const [rows] = await db.query(
      `SELECT
        o.id,
        o.order_code,
        o.total_amount,
        o.status,
        o.created_at,
        u.name AS customer_name,
        u.email AS customer_email,
        GROUP_CONCAT(DISTINCT e.name ORDER BY e.name SEPARATOR ', ') AS event_names,
        COALESCE(SUM(oi.quantity), 0) AS quantity,
        (SELECT p.payment_type FROM payments p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) AS payment_type,
        (SELECT p.status FROM payments p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) AS payment_status
      FROM orders o
      JOIN users u ON u.id = o.customer_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
      JOIN events e ON e.id = tc.event_id
      WHERE e.organizer_id = ?${eventFilter}
      GROUP BY o.id, o.order_code, o.total_amount, o.status, o.created_at, u.name, u.email
      ORDER BY o.created_at DESC`,
      params
    );

    const paymentLabels = {
      bank_transfer: "Bank Transfer", gopay: "GoPay", qris: "QRIS",
      credit_card: "Credit Card", shopeepay: "ShopeePay", cstore: "Convenience Store",
      echannel: "Mandiri Bill", akulaku: "Akulaku",
    };

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows.map((row) => ({
        ...row,
        id: Number(row.id),
        quantity: Number(row.quantity || 0),
        total_amount: Number(row.total_amount || 0),
        payment_method: paymentLabels[row.payment_type] || row.payment_type || null,
      })),
    });
  } catch (error) {
    console.error("Get Organizer Orders Error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar orders." });
  }
}

module.exports = {
  checkout,
  getMyOrders,
  getOrganizerOrders,
};
