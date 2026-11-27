const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRoles");
const {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoriesController");

const router = express.Router();

// Customer Home: public list of active categories.
router.get("/public", getPublicCategories);

// Super Admin category management.
router.get("/admin", authenticateToken, authorizeRoles("super_admin"), getAdminCategories);
router.post("/admin", authenticateToken, authorizeRoles("super_admin"), createCategory);
router.put("/admin/:id", authenticateToken, authorizeRoles("super_admin"), updateCategory);
router.delete("/admin/:id", authenticateToken, authorizeRoles("super_admin"), deleteCategory);

module.exports = router;
