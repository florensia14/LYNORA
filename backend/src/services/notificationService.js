const db = require("../config/database");

async function createNotification({ userId, eventId = null, title, message, type = "announcement" }) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0 || !title || !message) return null;
  const [result] = await db.execute(
    `INSERT INTO notifications (user_id, event_id, title, message, type)
     VALUES (?, ?, ?, ?, ?)`,
    [id, eventId ? Number(eventId) : null, String(title), String(message), String(type)]
  );
  return result.insertId;
}

async function notifyRole(role, payload) {
  const [users] = await db.execute(
    "SELECT id FROM users WHERE role = ? AND is_active = 1",
    [role]
  );
  for (const user of users) await createNotification({ ...payload, userId: user.id });
  return users.length;
}

module.exports = { createNotification, notifyRole };
