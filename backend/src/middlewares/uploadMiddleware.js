
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Root folder: backend/uploads
const uploadRoot = path.join(__dirname, "../../uploads");

const posterDir = path.join(uploadRoot, "posters");
const avatarDir = path.join(uploadRoot, "profiles", "avatars");
const bannerDir = path.join(uploadRoot, "profiles", "banners");
const categoryDir = path.join(uploadRoot, "categories");

// Buat folder otomatis jika belum tersedia
[posterDir, avatarDir, bannerDir, categoryDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Validasi format gambar
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Format file harus JPG, PNG, atau WEBP"));
  }

  cb(null, true);
};

// Fungsi pembuat konfigurasi upload
const createUpload = (uploadDir, prefix, maxSize) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();

      const filename = `${prefix}-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

      cb(null, filename);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });
};

// Upload poster konser
const upload = createUpload(
  posterDir,
  "poster",
  2 * 1024 * 1024
);

// Upload foto profil
upload.uploadAvatar = createUpload(
  avatarDir,
  "avatar",
  2 * 1024 * 1024
);

// Upload banner profil
upload.uploadBanner = createUpload(
  bannerDir,
  "banner",
  5 * 1024 * 1024
);

// Upload ikon kategori dari Admin Manage Categories.
upload.uploadCategoryIcon = createUpload(
  categoryDir,
  "category",
  2 * 1024 * 1024
);

module.exports = upload;
