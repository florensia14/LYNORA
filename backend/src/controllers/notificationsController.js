const db = require("../config/database");

// GET /api/notifications
// Mengambil notifikasi milik user yang sedang login.
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const [notifications] = await db.execute(
      `SELECT
        id,
        event_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 50`,
      [userId]
    );

    return res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error("getNotifications error:", error);

    return res.status(500).json({
      message: "Gagal mengambil notifikasi.",
    });
  }
};

// PATCH /api/notifications/:id/read
// Menandai satu notifikasi sebagai sudah dibaca.
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const [result] = await db.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Notifikasi tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Notifikasi berhasil ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("markNotificationRead error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui notifikasi.",
    });
  }
};

// PATCH /api/notifications/read-all
// Menandai seluruh notifikasi user sebagai sudah dibaca.
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    await db.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return res.status(200).json({
      message: "Semua notifikasi berhasil ditandai sudah dibaca.",
    });
  } catch (error) {
    console.error("markAllNotificationsRead error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui notifikasi.",
    });
  }
};