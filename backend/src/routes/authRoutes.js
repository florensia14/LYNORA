const express = require("express");
const {
  register,
  login,
  getMe,
} = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

router.get( "/admin-test", authenticateToken, authorizeRoles("super_admin"),
  (req, res) => {
    res.json({ message: "Akses Super Admin berhasil" });
  }
);

router.get( "/organizer-test", authenticateToken, authorizeRoles("organizer"),
  (req, res) => {
    res.json({ message: "Akses EO berhasil" });
  }
);

router.get( "/customer-test", authenticateToken, authorizeRoles("customer"),
  (req, res) => {
    res.json({ message: "Akses Customer berhasil" });
  }
);

module.exports = router;