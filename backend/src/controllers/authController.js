
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { createNotification, notifyRole } = require("../services/notificationService");
const { sendOrganizerAccountEmail } = require("../services/eticketEmailService");

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

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string"
    ) {
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

    if (
      normalizedName.length > 100 ||
      normalizedEmail.length > 150 ||
      normalizedPhone.length > 20
    ) {
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
      "SELECT id, approval_status FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.approval_status === "rejected") {
        return res.status(403).json({
          code: "REGISTRATION_REJECTED",
          message: "Sorry, your registration has been rejected by the LYNORA Super Admin.",
        });
      }

      if (existingUser.approval_status === "pending") {
        return res.status(409).json({
          code: "REGISTRATION_PENDING",
          message: "Your account is still awaiting Super Admin approval.",
        });
      }

      return res.status(409).json({
        code: "EMAIL_ALREADY_REGISTERED",
        message: "This email is already registered. Please log in instead.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone, password, role, approval_status, is_active)
       VALUES (?, ?, ?, ?, 'customer', 'pending', FALSE)`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
      ]
    );

    return res.status(201).json({
      message: "Your account is awaiting Super Admin approval.",
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
      `SELECT id, name, email, password, role, organization_name,
              profile_photo, is_active, approval_status
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

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Email or password is incorrect.",
      });
    }

    if (user.approval_status === "pending") {
      return res.status(403).json({
        code: "REGISTRATION_PENDING",
        message: "Your account is still awaiting Super Admin approval.",
      });
    }

    if (user.approval_status === "rejected") {
      return res.status(403).json({
        code: "REGISTRATION_REJECTED",
        message: "Sorry, your registration has been rejected by the LYNORA Super Admin.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account is currently inactive.",
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_name: user.organization_name || null,
        profile_photo: user.profile_photo || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Terjadi kesalahan saat login",
    });
  }
}

async function getRegistrationStatus(req, res) {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const phone = String(req.query.phone || "").trim();

    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email and phone number are required.",
      });
    }

    const [rows] = await db.execute(
      `SELECT approval_status, is_active
       FROM users
       WHERE email = ? AND phone = ? AND role = 'customer'
       LIMIT 1`,
      [email, phone]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        status: "not_found",
        message: "Registration could not be found. Please check your details.",
      });
    }

    const user = rows[0];
    const status = user.approval_status || (user.is_active ? "approved" : "pending");

    return res.status(200).json({
      success: true,
      status,
      message:
        status === "approved"
          ? "Your account has been approved. You can now log in."
          : status === "rejected"
            ? "Sorry, your registration has been rejected by the LYNORA Super Admin."
            : "Your account is still awaiting Super Admin approval.",
    });
  } catch (error) {
    console.error("Registration status error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check registration status right now.",
    });
  }
}

async function getMe(req, res) {
  try {
    const [users] = await db.execute(
      `SELECT id, name, email, role, organization_name,
              profile_photo, is_active
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

// ============================================================
// SUPER ADMIN - MANAGE USERS
// Endpoint didefinisikan di authRoutes.js agar tidak menambah
// file controller atau route baru.
// ============================================================

async function listAdminUsers(req, res) {
  try {
    const [users] = await db.execute(
      `SELECT id, name, email, phone, role, organization_name,
              approval_status, is_active, created_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("List admin users error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar pengguna.",
    });
  }
}

async function createAdminUser(req, res) {
  let connection;

  try {
    const {
      role,
      name,
      applicant_name,
      organization_name,
      email,
      phone,
      password,
    } = req.body;

    const cleanRole = String(role || "").trim().toLowerCase();
    const cleanName = String(applicant_name || name || "").trim();
    const cleanOrganization = String(organization_name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();

    if (!["customer", "organizer"].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: "Role harus Customer atau Event Organizer.",
      });
    }

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      (cleanRole === "organizer" && !cleanOrganization)
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi.",
      });
    }

    if (
      cleanName.length > 100 ||
      cleanOrganization.length > 150 ||
      cleanEmail.length > 150 ||
      cleanPhone.length > 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Panjang salah satu field melebihi batas.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter.",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar.",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO users
        (name, email, phone, password, role, organization_name, approval_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', TRUE)`,
      [
        cleanName,
        cleanEmail,
        cleanPhone,
        hashedPassword,
        cleanRole,
        cleanRole === "organizer" ? cleanOrganization : null,
      ]
    );

    await connection.commit();

    // The new account is active immediately; create an in-app welcome notification.
    try {
      await createNotification({
        userId: result.insertId,
        title: "LYNORA Account Created",
        message: cleanRole === "organizer"
          ? `Your organizer account for ${cleanOrganization} is active. You can now sign in using the credentials sent to your email.`
          : "Your LYNORA account is active. You can now sign in.",
        type: "account",
      });
      if (cleanRole === "organizer") {
        await notifyRole("super_admin", {
          title: "Organizer Account Created",
          message: `${cleanOrganization} (${cleanEmail}) has been created and activated by Super Admin.`,
          type: "organizer_account",
        });
      }
    } catch (notificationError) {
      console.error("Create account notification error:", notificationError.message);
    }

    let emailSent = null;

    if (cleanRole === "organizer") {
      try {
        await sendOrganizerAccountEmail({
          name: cleanName,
          organizationName: cleanOrganization,
          email: cleanEmail,
          password: String(password),
        });
        emailSent = true;
      } catch (emailError) {
        emailSent = false;
        console.error("[organizer-email] Failed to send account email:", emailError);
      }
    }

    return res.status(201).json({
      success: true,
      message:
        cleanRole === "organizer"
          ? emailSent
            ? "Organizer account created successfully. The notification email has been sent."
            : "Organizer account created successfully, but the notification email could not be sent. Please check the SMTP configuration."
          : "Account created and activated successfully.",
      email_sent: emailSent,
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: cleanRole,
        organization_name: cleanRole === "organizer" ? cleanOrganization : null,
        approval_status: "approved",
        is_active: 1,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Create admin user error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat akun pengguna.",
    });
  } finally {
    if (connection) connection.release();
  }
}

async function updateAdminUserApproval(req, res) {
  try {
    const userId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !["approved", "rejected"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "ID atau status verifikasi tidak valid.",
      });
    }

    const [rows] = await db.execute(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    if (!["customer", "organizer"].includes(rows[0].role)) {
      return res.status(400).json({
        success: false,
        message: "Akun Super Admin tidak dapat diverifikasi melalui fitur ini.",
      });
    }

    await db.execute(
      "UPDATE users SET approval_status = ?, is_active = ? WHERE id = ?",
      [status, status === "approved" ? 1 : 0, userId]
    );

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Pendaftaran disetujui."
          : "Pendaftaran ditolak.",
    });
  } catch (error) {
    console.error("Update user approval error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui status verifikasi.",
    });
  }
}

async function updateAdminUser(req, res) {
  try {
    const userId = Number(req.params.id);
    const { name, organization_name, email, phone, password } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID pengguna tidak valid.",
      });
    }

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();
    const cleanOrganization =
      organization_name == null ? null : String(organization_name).trim();

    if (!cleanName || !cleanEmail || !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan nomor telepon wajib diisi.",
      });
    }

    if (
      cleanName.length > 100 ||
      cleanEmail.length > 150 ||
      cleanPhone.length > 20 ||
      (cleanOrganization && cleanOrganization.length > 150)
    ) {
      return res.status(400).json({
        success: false,
        message: "Panjang data melebihi batas.",
      });
    }

    if (password !== undefined && password !== "" && String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 8 karakter.",
      });
    }

    const [rows] = await db.execute(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    if (!["customer", "organizer"].includes(rows[0].role)) {
      return res.status(403).json({
        success: false,
        message: "Akun Super Admin tidak dapat diedit dari menu ini.",
      });
    }

    if (rows[0].role === "organizer" && !cleanOrganization) {
      return res.status(400).json({
        success: false,
        message: "Nama organisasi wajib diisi.",
      });
    }

    const [duplicate] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [cleanEmail, userId]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan akun lain.",
      });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(String(password), 12);

      await db.execute(
        `UPDATE users
         SET name = ?, email = ?, phone = ?, organization_name = ?, password = ?
         WHERE id = ?`,
        [
          cleanName,
          cleanEmail,
          cleanPhone,
          rows[0].role === "organizer" ? cleanOrganization : null,
          hashedPassword,
          userId,
        ]
      );
    } else {
      await db.execute(
        `UPDATE users
         SET name = ?, email = ?, phone = ?, organization_name = ?
         WHERE id = ?`,
        [
          cleanName,
          cleanEmail,
          cleanPhone,
          rows[0].role === "organizer" ? cleanOrganization : null,
          userId,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Update admin user error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui data pengguna.",
    });
  }
}

async function deleteAdminUser(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID pengguna tidak valid.",
      });
    }

    if (Number(req.user?.id) === userId) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak dapat menghapus akun yang sedang digunakan.",
      });
    }

    const [rows] = await db.execute(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    if (rows[0].role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Akun Super Admin tidak dapat dihapus dari menu ini.",
      });
    }

    await db.execute("DELETE FROM users WHERE id = ?", [userId]);

    return res.status(200).json({
      success: true,
      message: "Pengguna berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete admin user error:", error);

    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: "Akun masih terhubung dengan data transaksi atau aktivitas. Akun tidak dihapus agar riwayat tetap aman.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal menghapus pengguna.",
    });
  }
}

module.exports = {
  register,
  login,
  getRegistrationStatus,
  getMe,
  listAdminUsers,
  createAdminUser,
  updateAdminUserApproval,
  updateAdminUser,
  deleteAdminUser,
};
