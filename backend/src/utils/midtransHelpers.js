
// Batas Midtrans: halaman Snap maksimum berlaku 7 hari sejak token dibuat.
// Kita menggunakan 1 menit sebagai batas minimum.
const MAX_SNAP_EXPIRY_MINUTES = 7 * 24 * 60;
const MIN_SNAP_EXPIRY_MINUTES = 1;

const MAX_ITEM_DETAILS = 50;
const MAX_NAME_LENGTH = 50;

/**
 * Menghitung durasi Snap berdasarkan sisa masa berlaku order.
 * Durasi maksimum 7 hari dan minimum 1 menit.
 */
function clampExpiryMinutes(expiresAt, now = Date.now()) {
  const expiresAtMs =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();

  if (!Number.isFinite(expiresAtMs)) {
    throw new Error("Tanggal kedaluwarsa order tidak valid");
  }

  const remainingMs = expiresAtMs - now;

  if (remainingMs <= 0) {
    throw new Error("Masa berlaku order sudah habis");
  }

  if (remainingMs < MIN_SNAP_EXPIRY_MINUTES * 60000) {
    throw new Error("Sisa masa berlaku order kurang dari 1 menit");
  }

  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return Math.min(MAX_SNAP_EXPIRY_MINUTES, remainingMinutes);
}

/**
 * Memastikan token Snap masih dapat digunakan.
 * Token dianggap tidak valid jika:
 * - Waktu pembuatan token tidak valid.
 * - Masa berlaku order tidak valid.
 * - Order sudah kedaluwarsa.
 * - Sisa masa berlaku order kurang dari 1 menit.
 */
function isSnapTokenUsable({
  tokenCreatedAt,
  orderExpiresAt,
  now = Date.now(),
}) {
  if (!tokenCreatedAt || !orderExpiresAt) {
    return false;
  }

  const createdMs = new Date(tokenCreatedAt).getTime();
  const expiresMs = new Date(orderExpiresAt).getTime();

  if (!Number.isFinite(createdMs) || !Number.isFinite(expiresMs)) {
    return false;
  }

  if (expiresMs <= createdMs || expiresMs <= now) {
    return false;
  }

  const remainingAtCreation = expiresMs - createdMs;

  if (remainingAtCreation < MIN_SNAP_EXPIRY_MINUTES * 60000) {
    return false;
  }

  const durationMinutes = Math.min(
    MAX_SNAP_EXPIRY_MINUTES,
    Math.ceil(remainingAtCreation / 60000)
  );

  const tokenExpiresAt = createdMs + durationMinutes * 60000;

  return tokenExpiresAt > now && expiresMs > now;
}

/**
 * Mengubah nominal menjadi integer Rupiah.
 * IDR tidak menggunakan pecahan.
 */
function toRupiahInteger(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(number);
}

/**
 * Membersihkan teks agar aman digunakan
 * sebagai informasi transaksi.
 */
function sanitizeText(value, maxLength = MAX_NAME_LENGTH) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value)
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

/**
 * Membuat detail item untuk Midtrans.
 *
 * item_details hanya dikirim jika total seluruh item
 * sama persis dengan gross_amount.
 */
function buildItemDetails(items, totalAmount) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  if (items.length > MAX_ITEM_DETAILS) {
    return [];
  }

  const total = toRupiahInteger(totalAmount);

  if (total === null) {
    return [];
  }

  const details = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    const price = toRupiahInteger(item.price);
    const name = sanitizeText(item.name);

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return [];
    }

    if (price === null || price < 0) {
      return [];
    }

    if (!name) {
      return [];
    }

    const detail = {
      name,
      price,
      quantity,
    };

    if (item.id !== undefined && item.id !== null) {
      detail.id = String(item.id).slice(0, 50);
    }

    details.push(detail);
  }

  const sum = details.reduce(
    (accumulator, detail) =>
      accumulator + detail.price * detail.quantity,
    0
  );

  if (!Number.isSafeInteger(sum) || sum !== total) {
    return [];
  }

  return details;
}

/**
 * Membuat informasi pelanggan untuk Midtrans.
 */
function buildCustomerDetails(customer) {
  if (!customer) {
    return null;
  }

  const firstName = sanitizeText(customer.name);

  if (!firstName) {
    return null;
  }

  const email = sanitizeText(customer.email, 100);

  if (email) {
    return {
      first_name: firstName,
      email,
    };
  }

  return {
    first_name: firstName,
  };
}

/**
 * Membuat parameter transaksi Snap.
 *
 * Validasi:
 * - Nominal order harus integer dan lebih dari 0.
 * - Order harus memiliki order_code.
 * - Order belum kedaluwarsa.
 * - Sisa masa berlaku order minimal 1 menit.
 * - Detail item hanya dikirim jika totalnya sesuai.
 */
function buildSnapParameter({
  order,
  items,
  customer,
  now = Date.now(),
}) {
  if (!order) {
    throw new Error("Data order tidak ditemukan");
  }

  const orderCode = sanitizeText(order.order_code, 100);

  if (!orderCode) {
    throw new Error("Kode order tidak valid");
  }

  const grossAmount = toRupiahInteger(order.total_amount);

  if (
    grossAmount === null ||
    grossAmount <= 0 ||
    !Number.isSafeInteger(grossAmount)
  ) {
    throw new Error("Nominal order tidak valid untuk pembayaran");
  }

  const expiryDuration = clampExpiryMinutes(
    order.expires_at,
    now
  );

  const parameter = {
    transaction_details: {
      order_id: orderCode,
      gross_amount: grossAmount,
    },

    expiry: {
      unit: "minute",
      duration: expiryDuration,
    },
  };

  const itemDetails = buildItemDetails(
    items,
    grossAmount
  );

  if (itemDetails.length > 0) {
    parameter.item_details = itemDetails;
  }

  const customerDetails = buildCustomerDetails(customer);

  if (customerDetails) {
    parameter.customer_details = customerDetails;
  }

  return parameter;
}

/**
 * Memetakan error Midtrans menjadi status HTTP.
 * Pesan internal dari Midtrans tidak dikirim langsung
 * kepada pengguna.
 */
function mapMidtransError(error) {
  const httpStatusCode =
    Number(error?.httpStatusCode) || null;

  const apiStatusMessage = sanitizeText(
    error?.ApiResponse?.status_message,
    120
  );

  const apiStatusCode = sanitizeText(
    error?.ApiResponse?.status_code,
    10
  );

  const errorName =
    sanitizeText(error?.name, 60) || "Error";

  const logDetail = [
    `name=${errorName}`,
    `httpStatusCode=${httpStatusCode ?? "none"}`,
    apiStatusCode
      ? `apiStatus=${apiStatusCode}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    httpStatusCode === 401 ||
    httpStatusCode === 403
  ) {
    return {
      status: 502,
      code: "upstream_unauthorized",
      logDetail,
      apiStatusMessage,
      message: "Layanan pembayaran sedang tidak dapat diakses",
    };
  }

  if (httpStatusCode === 404) {
    return {
      status: 502,
      code: "upstream_not_found",
      logDetail,
      apiStatusMessage,
      message: "Transaksi tidak ditemukan pada penyedia pembayaran",
    };
  }

  if (
    httpStatusCode &&
    httpStatusCode >= 400 &&
    httpStatusCode < 500
  ) {
    return {
      status: 400,
      code: "invalid_request",
      logDetail,
      apiStatusMessage,
      message: "Permintaan pembayaran tidak valid",
    };
  }

  if (
    httpStatusCode &&
    httpStatusCode >= 500
  ) {
    return {
      status: 502,
      code: "upstream_error",
      logDetail,
      apiStatusMessage,
      message: "Layanan pembayaran sedang mengalami gangguan",
    };
  }

  return {
    status: 502,
    code: "upstream_unavailable",
    logDetail,
    apiStatusMessage,
    message: "Gagal menghubungi layanan pembayaran",
  };
}

module.exports = {
  MAX_SNAP_EXPIRY_MINUTES,
  MIN_SNAP_EXPIRY_MINUTES,
  clampExpiryMinutes,
  isSnapTokenUsable,
  toRupiahInteger,
  sanitizeText,
  buildItemDetails,
  buildCustomerDetails,
  buildSnapParameter,
  mapMidtransError,
};
