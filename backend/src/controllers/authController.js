
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Nama, email, nomor telepon, dan password wajib diisi",
      });
    }

    if (typeof name !== "string" ||
        typeof email !== "string" ||
        typeof phone !== "string" ||
        typeof password !== "string") {
      return res.status(400).json({
        message: "Format data tidak valid",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({
        message: "Semua data wajib diisi",
      });
    }

    if (normalizedName.length > 100 ||
        normalizedEmail.length > 150 ||
        normalizedPhone.length > 20) {
      return res.status(400).json({
        message: "Panjang data melebihi batas yang ditentukan",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password minimal 8 karakter",
      });
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES (?, ?, ?, ?, 'customer')`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
      ]
    );

    return res.status(201).json({
      message: "Registrasi berhasil",
      user: {
        id: result.insertId,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);

    return res.status(500).json({
      message: "Terjadi kesalahan saat registrasi",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email dan password wajib diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      `SELECT id, name, email, password, role, is_active
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Akun dinonaktifkan",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Terjadi kesalahan saat login",
    });
  }
}

async function getMe(req, res) {
  try {
    const [users] = await db.execute(
      `SELECT id, name, email, role, profile_photo, is_active
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(404).json({
        message: "Akun tidak ditemukan atau dinonaktifkan",
      });
    }

    return res.json({ user: users[0] });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      message: "Gagal mengambil data akun",
    });
  }
}

module.exports = { register, login, getMe };
