
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

const BASE_UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

const getProfile = async (userId) => {
  const [rows] = await db.execute(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      profile_photo,
      cover_photo,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  );

  return rows[0];
};

// Hapus file lama hanya jika lokasinya berada di folder profil
const removeOldProfileFile = async (filePath, folder) => {
  if (!filePath) return;

  const normalized = filePath.replace(/\\/g, "/");
  const expectedPrefix = `/uploads/profiles/${folder}/`;

  if (!normalized.startsWith(expectedPrefix)) return;

  const filename = path.basename(normalized);
  const allowedPath = path.resolve(
    BASE_UPLOAD_DIR,
    "profiles",
    folder,
    filename
  );

  const allowedDirectory = path.resolve(
    BASE_UPLOAD_DIR,
    "profiles",
    folder
  );

  if (!allowedPath.startsWith(allowedDirectory + path.sep)) return;

  try {
    await fs.promises.unlink(allowedPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Gagal menghapus file profil lama:", error);
    }
  }
};

// GET /api/profile/me
const getMyProfile = async (req, res) => {
  try {
    const user = await getProfile(req.user.id);

    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data profil.",
    });
  }
};

// PUT /api/profile/me
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama dan email wajib diisi.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || null;

    if (cleanName.length > 100 || cleanEmail.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Nama atau email terlalu panjang.",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [cleanEmail, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan akun lain.",
      });
    }

    await db.execute(
      `UPDATE users
       SET name = ?, email = ?, phone = ?
       WHERE id = ?`,
      [cleanName, cleanEmail, cleanPhone, userId]
    );

    const user = await getProfile(userId);

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui.",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui profil.",
    });
  }
};

// PATCH /api/profile/avatar
const updateProfileAvatar = async (req, res) => {
  let uploadedPath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Silakan pilih foto profil terlebih dahulu.",
      });
    }

    uploadedPath = req.file.path;

    const userId = req.user.id;
    const newPhoto = `/uploads/profiles/avatars/${req.file.filename}`;

    const [rows] = await db.execute(
      "SELECT profile_photo FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      await fs.promises.unlink(uploadedPath).catch(() => {});
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    await db.execute(
      "UPDATE users SET profile_photo = ? WHERE id = ?",
      [newPhoto, userId]
    );

    await removeOldProfileFile(rows[0].profile_photo, "avatars");

    const user = await getProfile(userId);

    return res.status(200).json({
      success: true,
      message: "Foto profil berhasil diperbarui.",
      user,
    });
  } catch (error) {
    console.error("Update avatar error:", error);

    if (uploadedPath) {
      await fs.promises.unlink(uploadedPath).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui foto profil.",
    });
  }
};

// PATCH /api/profile/banner
const updateProfileBanner = async (req, res) => {
  let uploadedPath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Silakan pilih gambar banner terlebih dahulu.",
      });
    }

    uploadedPath = req.file.path;

    const userId = req.user.id;
    const newBanner = `/uploads/profiles/banners/${req.file.filename}`;

    const [rows] = await db.execute(
      "SELECT cover_photo FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      await fs.promises.unlink(uploadedPath).catch(() => {});
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    await db.execute(
      "UPDATE users SET cover_photo = ? WHERE id = ?",
      [newBanner, userId]
    );

    await removeOldProfileFile(rows[0].cover_photo, "banners");

    const user = await getProfile(userId);

    return res.status(200).json({
      success: true,
      message: "Banner profil berhasil diperbarui.",
      user,
    });
  } catch (error) {
    console.error("Update banner error:", error);

    if (uploadedPath) {
      await fs.promises.unlink(uploadedPath).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui banner profil.",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateProfileAvatar,
  updateProfileBanner,
};
