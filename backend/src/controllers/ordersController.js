
const db = require("../config/database");

// POST /api/orders/checkout
async function checkout(req, res) {
    const connection = await db.getConnection();

    try {
        const { items } = req.body;
        const customerId = req.user.id;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Pilih minimal satu kategori tiket",
            });
        }

        // Validasi input dan gabungkan kategori yang duplikat
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

            // Hitung tiket yang sudah dipesan dan masih berlaku
            const [reserved] = await connection.execute(
                `SELECT COALESCE(SUM(oi.quantity), 0) AS total
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.ticket_category_id = ?
         AND (
           o.status = 'paid'
           OR (o.status = 'pending' AND o.expires_at > NOW())
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
        await connection.rollback();

        console.error("Checkout error:", error.message);

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
                message: error.message,
            });
        }

        return res.status(500).json({
            message: "Gagal membuat order",
        });
    } finally {
        connection.release();
    }
}

module.exports = { checkout };
