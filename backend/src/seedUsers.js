require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/database");

const testUsers = [
  {
    name: "EO Test",
    email: "eo.test@lynora.local",
    password: "EOTest123!",
    role: "organizer",
  },
  {
    name: "Super Admin Test",
    email: "admin.test@lynora.local",
    password: "AdminTest123!",
    role: "super_admin",
  },
];

async function seedUsers() {
  try {
    for (const user of testUsers) {
      const [existingUsers] = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );

      if (existingUsers.length > 0) {
        console.log(`Akun ${user.email} sudah ada, dilewati.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 12);

      await db.execute(
        `INSERT INTO users (name, email, password, role, is_active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [user.name, user.email, hashedPassword, user.role]
      );

      console.log(`Berhasil membuat akun ${user.role}: ${user.email}`);
    }
  } catch (error) {
    console.error("Seed gagal:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

seedUsers();
