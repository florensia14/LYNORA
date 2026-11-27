const crypto = require("crypto");

const REQUIRED_NOTIFICATION_FIELDS = [
  "order_id",
  "status_code",
  "gross_amount",
  "signature_key",
];

const SIGNATURE_HEX_PATTERN = /^[a-f0-9]{128}$/;

function normalizeField(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text ? text : null;
}

/**
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 * Nilai gross_amount wajib memakai string persis seperti yang dikirim Midtrans.
 */
function computeMidtransSignature({
  orderId,
  statusCode,
  grossAmount,
  serverKey,
}) {
  if (!serverKey) {
    throw new Error("Server Key Midtrans belum dikonfigurasi");
  }

  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`, "utf8")
    .digest("hex");
}

function timingSafeEquals(expectedHex, givenHex) {
  const expected = Buffer.from(expectedHex, "utf8");
  const given = Buffer.from(givenHex, "utf8");
  const sameLength = expected.length === given.length;

  // timingSafeEqual melempar error bila panjang buffer berbeda.
  // Saat panjang berbeda, bandingkan expected dengan dirinya sendiri
  // supaya waktu eksekusi tetap konstan, lalu hasilnya tetap false.
  const equal = crypto.timingSafeEqual(
    expected,
    sameLength ? given : expected
  );

  return sameLength && equal;
}

/**
 * @returns {{ valid: boolean, reason: string, missing?: string[] }}
 */
function verifyMidtransSignature(notification, serverKey) {
  if (!serverKey) {
    return { valid: false, reason: "missing_server_key" };
  }

  if (
    !notification ||
    typeof notification !== "object" ||
    Array.isArray(notification)
  ) {
    return { valid: false, reason: "invalid_body" };
  }

  const missing = REQUIRED_NOTIFICATION_FIELDS.filter(
    (field) => !normalizeField(notification[field])
  );

  if (missing.length > 0) {
    return { valid: false, reason: "incomplete_notification", missing };
  }

  const givenSignature = normalizeField(notification.signature_key).toLowerCase();

  if (!SIGNATURE_HEX_PATTERN.test(givenSignature)) {
    return { valid: false, reason: "malformed_signature" };
  }

  const expectedSignature = computeMidtransSignature({
    orderId: normalizeField(notification.order_id),
    statusCode: normalizeField(notification.status_code),
    grossAmount: normalizeField(notification.gross_amount),
    serverKey,
  });

  if (!timingSafeEquals(expectedSignature, givenSignature)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return { valid: true, reason: "ok" };
}

module.exports = {
  verifyMidtransSignature,
  computeMidtransSignature,
};
