const db = require("../config/database");

// Public: active categories for the customer home page.
async function getPublicCategories(req, res) {
  try {
    const [categories] = await db.execute(
      `SELECT id, name, description
       FROM categories
       WHERE status = 'active'
       ORDER BY name ASC`
    );

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get public categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve categories.",
    });
  }
}

// Super Admin: list categories and count concerts using each category.
async function getAdminCategories(req, res) {
  try {
    const [categories] = await db.execute(
      `SELECT
         c.id,
         c.name,
         c.description,
         c.status,
         c.created_at,
         c.updated_at,
         COUNT(e.id) AS total_concerts
       FROM categories c
       LEFT JOIN events e
         ON e.category_id = c.id
        AND e.deleted_at IS NULL
       GROUP BY c.id, c.name, c.description, c.status, c.created_at, c.updated_at
       ORDER BY c.name ASC`
    );

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get admin categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve categories." });
  }
}

async function createCategory(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const status = req.body.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: "A category with this name already exists." });
    }

    const [result] = await db.execute(
      "INSERT INTO categories (name, description, status) VALUES (?, ?, ?)",
      [name, description || null, status]
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      category: { id: result.insertId, name, description: description || null, status },
    });
  } catch (error) {
    console.error("Create category error:", error);
    return res.status(500).json({ success: false, message: "Failed to create category." });
  }
}

async function updateCategory(req, res) {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const status = req.body.status === "inactive" ? "inactive" : "active";

    if (!Number.isInteger(id) || id <= 0 || !name) {
      return res.status(400).json({ success: false, message: "A valid category ID and name are required." });
    }

    const [existing] = await db.execute(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
      [name, id]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: "A category with this name already exists." });
    }

    const [result] = await db.execute(
      "UPDATE categories SET name = ?, description = ?, status = ? WHERE id = ?",
      [name, description || null, status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    return res.status(200).json({ success: true, message: "Category updated successfully." });
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({ success: false, message: "Failed to update category." });
  }
}

async function deleteCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid category ID." });
    }

    const [used] = await db.execute(
      "SELECT id FROM events WHERE category_id = ? AND deleted_at IS NULL LIMIT 1",
      [id]
    );
    if (used.length) {
      return res.status(409).json({
        success: false,
        message: "This category is assigned to existing concerts. Set it to inactive instead.",
      });
    }

    const [result] = await db.execute("DELETE FROM categories WHERE id = ?", [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    return res.status(200).json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete category." });
  }
}

module.exports = {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
