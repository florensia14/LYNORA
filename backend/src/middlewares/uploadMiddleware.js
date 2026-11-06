
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Folder penyimpanan bukti pembayaran
const uploadDir = path.join(__dirname, "../../uploads/payments");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `payment-${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});

// Validasi tipe file
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file harus JPG, PNG, atau WEBP"));
  }
};

const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = uploadPaymentProof;
