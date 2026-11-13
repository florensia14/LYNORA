
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

// Config
const db = require("./config/database");
const midtransConfig = require("./config/midtrans");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Akses file poster yang diunggah
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Health Check
app.get("/", (req, res) => {
  return res.json({
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
const authRoutes = require("./routes/authRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const paymentsRoutes = require("./routes/paymentsRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);

// Upload Error Handler
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
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

  console.error("Application error:", error);

  return res.status(500).json({
    message: "Terjadi kesalahan pada server",
  });
});

// Midtrans Configuration
function logMidtransConfiguration() {
  const summary = midtransConfig.describeConfiguration();
  const { ready, issues } = midtransConfig.validateConfiguration();

  if (!summary.serverKeyPresent) {
    console.error(
      "[midtrans] MIDTRANS_SERVER_KEY belum diset. Endpoint pembayaran Midtrans akan membalas 503."
    );

    return;
  }

  console.log(
    `[midtrans] mode=${summary.mode} ` +
      `clientKey=${summary.clientKeyPresent ? "ada" : "tidak ada"} ` +
      `serverKeyFormat=${summary.serverKeyEnvironment}`
  );

  if (!ready) {
    console.error(
      "[midtrans] KONFIGURASI TIDAK AMAN - endpoint pembayaran Midtrans dinonaktifkan: " +
        issues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join("; ")
    );
  }
}

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`LYNORA API running at http://localhost:${PORT}`);
  logMidtransConfiguration();
});
