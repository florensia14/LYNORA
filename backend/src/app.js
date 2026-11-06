
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Config
const db = require("./config/database");

// Routes
const authRoutes = require("./routes/authRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const paymentsRoutes = require("./routes/paymentsRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Health Check
app.get("/", (req, res) => {
  res.json({
    message: "LYNORA Backend API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    return res.json({
      status: "OK",
      message: "Backend and database connected",
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    return res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);

// Upload Error Handler
app.use((error, req, res, next) => {
  if (error instanceof require("multer").MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Ukuran file maksimal 2 MB",
      });
    }

    return res.status(400).json({
      message: "Terjadi kesalahan saat mengunggah file",
    });
  }

  if (error.message === "Format file harus JPG, PNG, atau WEBP") {
    return res.status(400).json({
      message: error.message,
    });
  }

  console.error("Application error:", error.message);

  return res.status(500).json({
    message: "Terjadi kesalahan pada server",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`LYNORA API running at http://localhost:${PORT}`);
});
