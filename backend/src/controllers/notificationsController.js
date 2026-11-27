
const db = require("../config/database");

function getUserId(req) {
  return req.user?.id ?? req.user?.userId ?? null;
};

// GET /api/notifications
// Mengambil notifikasi milik customer yang sedang login.
exports.getNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [notifications] = await db.execute(
      `
      SELECT
        n.id,
        n.event_id,
        n.title,
        n.message,
        n.type,
        n.is_read,
        n.created_at,

        e.name AS event_name,
        e.poster_url,
        e.start_date,

        v.name AS venue_name,
        v.address AS venue_address

      FROM notifications n

      LEFT JOIN events e
        ON n.event_id = e.id

      LEFT JOIN venues v
        ON e.venue_id = v.id

      WHERE n.user_id = ?

      ORDER BY n.created_at DESC, n.id DESC

      LIMIT 100
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil notifikasi.",
      notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil notifikasi.",
    });
  }
};

// PATCH /api/notifications/:id/read
// Menandai satu notifikasi sebagai sudah dibaca.
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !Number.isSafeInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID notifikasi tidak valid.",
      });
    }

    const [result] = await db.execute(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ?
        AND user_id = ?
      `,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute(
        `
        SELECT id
        FROM notifications
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [notificationId, userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notifikasi tidak ditemukan.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notifikasi berhasil ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui notifikasi.",
    });
  }
};

// PATCH /api/notifications/read-all
// Menandai semua notifikasi milik user sebagai sudah dibaca.
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await db.execute(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
        AND is_read = 0
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Semua notifikasi berhasil ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui semua notifikasi.",
    });
  }
};
