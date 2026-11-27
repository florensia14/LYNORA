const express = require("express");
const router = express.Router();

const authenticateToken = require("../middlewares/authMiddleware");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = require("../controllers/wishlistController");

// Semua endpoint Wishlist membutuhkan autentikasi
router.use(authenticateToken);

router.get("/", getWishlist);
router.post("/:eventId", addToWishlist);
router.delete("/", clearWishlist);
router.delete("/:eventId", removeFromWishlist);

module.exports = router;