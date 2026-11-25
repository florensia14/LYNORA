const express = require("express");
const {
  register,
  login,
  getRegistrationStatus,
  getMe,
  listAdminUsers,
  createAdminUser,
  updateAdminUserApproval,
  updateAdminUser,
  deleteAdminUser,
} = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/registration-status", getRegistrationStatus);
router.get("/me", authenticateToken, getMe);

// Super Admin - Manage Users
// URL lengkap: /api/auth/admin/users
router.get(
  "/admin/users",
  authenticateToken,
  authorizeRoles("super_admin"),
  listAdminUsers
);
router.post(
  "/admin/users",
  authenticateToken,
  authorizeRoles("super_admin"),
  createAdminUser
);
router.patch(
  "/admin/users/:id",
  authenticateToken,
  authorizeRoles("super_admin"),
  updateAdminUser
);
router.delete(
  "/admin/users/:id",
  authenticateToken,
  authorizeRoles("super_admin"),
  deleteAdminUser
);
router.patch(
  "/admin/users/:id/approval",
  authenticateToken,
  authorizeRoles("super_admin"),
  updateAdminUserApproval
);

module.exports = router;
