
const express = require("express");

const {
  getMyProfile,
  updateMyProfile,
  updateProfileAvatar,
  updateProfileBanner,
} = require("../controllers/profileController");

const authenticateToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Semua endpoint profile wajib login
router.use(authenticateToken);

// Mengambil data profile
router.get("/me", getMyProfile);

// Mengubah informasi profile
router.put("/me", updateMyProfile);

// Mengubah foto profile
router.patch(
  "/avatar",
  upload.uploadAvatar.single("avatar"),
  updateProfileAvatar
);

// Mengubah banner profile
router.patch(
  "/banner",
  upload.uploadBanner.single("banner"),
  updateProfileBanner
);

module.exports = router;
