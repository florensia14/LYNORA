const db = require("../config/database");

// GET: Ambil semua event Wishlist milik user yang login
async function getWishlist(req, res) {
  try {
    const userId = req.user.id;

    const [wishlists] = await db.execute(
      `SELECT
        w.id AS wishlist_id,
        w.created_at AS wishlisted_at,

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
        CASE
          WHEN NOW() >= e.end_date THEN 'completed'
          WHEN NOW() >= e.start_date THEN 'ongoing'
          ELSE 'upcoming'
        END AS lifecycle_status,

        c.id AS category_id,
        c.name AS category_name,

        v.id AS venue_id,
        v.name AS venue_name,
        v.address AS venue_address,

        (
          SELECT MIN(tc.price)
          FROM ticket_categories tc
          WHERE tc.event_id = e.id
        ) AS starting_price

      FROM wishlists w

      INNER JOIN events e
        ON e.id = w.event_id

      LEFT JOIN categories c
        ON c.id = e.category_id

      LEFT JOIN venues v
        ON v.id = e.venue_id

      WHERE w.user_id = ?
        AND e.approval_status = 'approved'
        AND e.publication_status = 'published'
        AND e.deleted_at IS NULL

      ORDER BY w.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      message: "Wishlist berhasil diambil",
      total: wishlists.length,
      wishlists,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(500).json({
      message: "Gagal mengambil Wishlist",
    });
  }
}

// POST: Tambahkan event ke Wishlist
async function addToWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    if (!/^[1-9]\d*$/.test(eventId)) {
      return res.status(400).json({
        message: "ID event tidak valid",
      });
    }

    const [events] = await db.execute(
      `SELECT id
       FROM events
       WHERE id = ?
         AND status = 'published'`,
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        message: "Event tidak ditemukan atau belum dipublikasikan",
      });
    }

    const [existing] = await db.execute(
      `SELECT id
       FROM wishlists
       WHERE user_id = ?
         AND event_id = ?`,
      [userId, eventId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Event sudah ada di Wishlist",
      });
    }

    await db.execute(
      `INSERT INTO wishlists (user_id, event_id)
       VALUES (?, ?)`,
      [userId, eventId]
    );

    return res.status(201).json({
      message: "Event berhasil ditambahkan ke Wishlist",
    });
  } catch (error) {
    console.error("Add wishlist error:", error);

    return res.status(500).json({
      message: "Gagal menambahkan event ke Wishlist",
    });
  }
}

// DELETE: Hapus satu event dari Wishlist
async function removeFromWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    if (!/^[1-9]\d*$/.test(eventId)) {
      return res.status(400).json({
        message: "ID event tidak valid",
      });
    }

    const [result] = await db.execute(
      `DELETE FROM wishlists
       WHERE user_id = ?
         AND event_id = ?`,
      [userId, eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Event tidak ditemukan di Wishlist",
      });
    }

    return res.status(200).json({
      message: "Event berhasil dihapus dari Wishlist",
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);

    return res.status(500).json({
      message: "Gagal menghapus event dari Wishlist",
    });
  }
}

// DELETE: Kosongkan seluruh Wishlist
async function clearWishlist(req, res) {
  try {
    const userId = req.user.id;

    const [result] = await db.execute(
      `DELETE FROM wishlists
       WHERE user_id = ?`,
      [userId]
    );

    return res.status(200).json({
      message: "Wishlist berhasil dikosongkan",
      deleted: result.affectedRows,
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);

    return res.status(500).json({
      message: "Gagal mengosongkan Wishlist",
    });
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};