const db = require("../config/database");

async function createNotification({ userId, eventId = null, title, message, type = "announcement" }) {
  if (!userId || !title || !message) return;
  await db.execute(
    `INSERT INTO notifications (user_id, event_id, title, message, type)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(userId), eventId ? Number(eventId) : null, String(title), String(message), type]
  );
}

async function notifyRole(role, payload) {
  const [users] = await db.execute(
    "SELECT id FROM users WHERE role = ? AND is_active = 1",
    [role]
  );
  for (const user of users) {
    await createNotification({ ...payload, userId: user.id });
  }
}

module.exports = { createNotification, notifyRole };
