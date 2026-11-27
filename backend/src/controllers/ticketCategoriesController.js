const db = require("../config/database");

const isValidId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
};

const getOrganizerEvent = async (eventId, organizerId) => {
  const [events] = await db.execute(
    `SELECT id, status FROM events
     WHERE id = ? AND organizer_id = ? LIMIT 1`,
    [eventId, organizerId]
  );
  return events[0] || null;
};

const createTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const organizerId = req.user?.id;
    const { name, price, quota, benefit } = req.body;

    if (!isValidId(eventId)) return res.status(400).json({ message: "Event ID tidak valid" });
    if (!organizerId) return res.status(401).json({ message: "Unauthorized" });
    if (!name || !String(name).trim()) return res.status(400).json({ message: "Nama kategori tiket wajib diisi" });

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);
    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
      return res.status(400).json({ message: "Harga tiket harus berupa angka minimal 0" });
    }
    if (!Number.isSafeInteger(ticketQuota) || ticketQuota <= 0) {
      return res.status(400).json({ message: "Kuota tiket harus berupa bilangan bulat lebih dari 0" });
    }

    const event = await getOrganizerEvent(eventId, organizerId);
    if (!event) return res.status(404).json({ message: "Konser tidak ditemukan atau bukan milik kamu" });
    if (!["pending", "published"].includes(event.status)) {
      return res.status(400).json({ message: "Kategori tiket tidak dapat ditambahkan pada status konser ini" });
    }

    const [result] = await db.execute(
      `INSERT INTO ticket_categories (event_id, name, price, quota, benefit)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, String(name).trim(), ticketPrice, ticketQuota, benefit ? String(benefit).trim() : null]
    );
    const [categories] = await db.execute(
      `SELECT id, event_id, name, price, quota, benefit, created_at, updated_at
       FROM ticket_categories WHERE id = ? LIMIT 1`,
      [result.insertId]
    );
    return res.status(201).json({ message: "Kategori tiket berhasil ditambahkan", ticket_category: categories[0] });
  } catch (error) {
    console.error("Create Ticket Category Error:", error);
    return res.status(500).json({ message: "Gagal menambahkan kategori tiket" });
  }
};

const getTicketCategories = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const organizerId = req.user?.id;
    if (!isValidId(eventId)) return res.status(400).json({ message: "Event ID tidak valid" });
    if (!organizerId) return res.status(401).json({ message: "Unauthorized" });

    const [events] = await db.execute(
      `SELECT id, name, status, approval_status, publication_status,
              start_date, end_date, sales_start_at, sales_end_at, poster_url
       FROM events
       WHERE id = ? AND organizer_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [eventId, organizerId]
    );
    if (!events.length) {
      return res.status(404).json({ message: "Konser tidak ditemukan atau bukan milik kamu" });
    }

    const [categories] = await db.execute(
      `SELECT
         tc.id,
         tc.event_id,
         tc.name,
         tc.price,
         tc.quota,
         tc.benefit,
         tc.created_at,
         tc.updated_at,
         COALESCE(s.sold, 0) AS sold,
         GREATEST(tc.quota - COALESCE(s.sold, 0), 0) AS remaining,
         CASE
           WHEN e.status = 'cancelled' OR e.approval_status = 'rejected' THEN 'Unavailable'
           WHEN e.status = 'completed'
             OR e.end_date < NOW()
             OR (e.sales_end_at IS NOT NULL AND e.sales_end_at < NOW()) THEN 'Ended'
           WHEN e.approval_status <> 'approved'
             OR e.publication_status <> 'published' THEN 'Unavailable'
           WHEN e.sales_start_at IS NULL THEN 'Unavailable'
           WHEN e.sales_start_at > NOW() THEN 'Coming Soon'
           WHEN COALESCE(s.sold, 0) >= tc.quota THEN 'Sold Out'
           ELSE 'On Sale'
         END AS status
       FROM ticket_categories tc
       INNER JOIN events e ON e.id = tc.event_id
       LEFT JOIN (
         SELECT
           oi.ticket_category_id,
           SUM(oi.quantity) AS sold
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'paid'
         GROUP BY oi.ticket_category_id
       ) s ON s.ticket_category_id = tc.id
       WHERE tc.event_id = ?
       ORDER BY tc.price ASC, tc.id ASC`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil kategori tiket",
      event: events[0],
      event_id: eventId,
      total: categories.length,
      ticket_categories: categories.map((category) => ({
        ...category,
        price: Number(category.price),
        quota: Number(category.quota),
        sold: Number(category.sold),
        remaining: Number(category.remaining),
      })),
    });
  } catch (error) {
    console.error("Get Ticket Categories Error:", error);
    return res.status(500).json({ message: "Gagal mengambil kategori tiket" });
  }
};

const updateTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const ticketId = Number(req.params.ticketId);
    const organizerId = req.user?.id;
    const { name, price, quota, benefit } = req.body;

    if (!isValidId(eventId) || !isValidId(ticketId)) return res.status(400).json({ message: "Event ID atau Ticket ID tidak valid" });
    if (!organizerId) return res.status(401).json({ message: "Unauthorized" });
    if (!name || !String(name).trim()) return res.status(400).json({ message: "Nama kategori tiket wajib diisi" });

    const ticketPrice = Number(price);
    const ticketQuota = Number(quota);
    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) return res.status(400).json({ message: "Harga tiket harus berupa angka minimal 0" });
    if (!Number.isSafeInteger(ticketQuota) || ticketQuota <= 0) return res.status(400).json({ message: "Kuota tiket harus berupa bilangan bulat lebih dari 0" });

    const event = await getOrganizerEvent(eventId, organizerId);
    if (!event) return res.status(404).json({ message: "Konser tidak ditemukan atau bukan milik kamu" });

    const [categories] = await db.execute(
      `SELECT id FROM ticket_categories WHERE id = ? AND event_id = ? LIMIT 1`,
      [ticketId, eventId]
    );
    if (!categories.length) return res.status(404).json({ message: "Kategori tiket tidak ditemukan" });

    await db.execute(
      `UPDATE ticket_categories SET name = ?, price = ?, quota = ?, benefit = ?
       WHERE id = ? AND event_id = ?`,
      [String(name).trim(), ticketPrice, ticketQuota, benefit ? String(benefit).trim() : null, ticketId, eventId]
    );
    return res.status(200).json({ message: "Kategori tiket berhasil diperbarui" });
  } catch (error) {
    console.error("Update Ticket Category Error:", error);
    return res.status(500).json({ message: "Gagal memperbarui kategori tiket" });
  }
};

const deleteTicketCategory = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const ticketId = Number(req.params.ticketId);
    const organizerId = req.user?.id;
    if (!isValidId(eventId) || !isValidId(ticketId)) return res.status(400).json({ message: "Event ID atau Ticket ID tidak valid" });
    if (!organizerId) return res.status(401).json({ message: "Unauthorized" });

    const event = await getOrganizerEvent(eventId, organizerId);
    if (!event) return res.status(404).json({ message: "Konser tidak ditemukan atau bukan milik kamu" });

    const [categories] = await db.execute(
      `SELECT id FROM ticket_categories WHERE id = ? AND event_id = ? LIMIT 1`,
      [ticketId, eventId]
    );
    if (!categories.length) return res.status(404).json({ message: "Kategori tiket tidak ditemukan" });

    await db.execute(
      `DELETE FROM ticket_categories WHERE id = ? AND event_id = ?`,
      [ticketId, eventId]
    );
    return res.status(200).json({ message: "Kategori tiket berhasil dihapus" });
  } catch (error) {
    console.error("Delete Ticket Category Error:", error);
    return res.status(500).json({ message: "Gagal menghapus kategori tiket" });
  }
};

module.exports = {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
};
