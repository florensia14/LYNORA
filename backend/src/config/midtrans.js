
const midtransClient = require("midtrans-client");

// ==========================================
// KEY PREFIX
// ==========================================

// Sandbox
const SANDBOX_SERVER_KEY_PREFIX = "SB-Mid-server-";
const SANDBOX_CLIENT_KEY_PREFIX = "SB-Mid-client-";

// Production
const PRODUCTION_SERVER_KEY_PREFIX = "Mid-server-";
const PRODUCTION_CLIENT_KEY_PREFIX = "Mid-client-";

// ==========================================
// ENVIRONMENT VALUES
// ==========================================

const TRUE_VALUES = new Set([
  "true",
  "1",
  "yes",
  "y",
  "production",
  "prod",
]);

const FALSE_VALUES = new Set([
  "false",
  "0",
  "no",
  "n",
  "sandbox",
]);

const VALID_MODE_VALUES = new Set([
  ...TRUE_VALUES,
  ...FALSE_VALUES,
]);

// ==========================================
// ENV PARSING
// ==========================================

function readEnv(name) {
  const value = process.env[name];

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

// ==========================================
// MIDTRANS SETTINGS
// ==========================================

function isProduction() {
  return parseBooleanFlag(
    process.env.MIDTRANS_IS_PRODUCTION,
    false
  );
}

function getServerKey() {
  return readEnv("MIDTRANS_SERVER_KEY");
}

function getClientKey() {
  return readEnv("MIDTRANS_CLIENT_KEY");
}

// ==========================================
// DETECT KEY ENVIRONMENT
// ==========================================

function detectKeyEnvironment(key, kind) {
  if (!key) {
    return "missing";
  }

  const sandboxPrefix =
    kind === "server"
      ? SANDBOX_SERVER_KEY_PREFIX
      : SANDBOX_CLIENT_KEY_PREFIX;

  const productionPrefix =
    kind === "server"
      ? PRODUCTION_SERVER_KEY_PREFIX
      : PRODUCTION_CLIENT_KEY_PREFIX;

  if (key.startsWith(sandboxPrefix)) {
    return "sandbox";
  }

  if (key.startsWith(productionPrefix)) {
    return "production";
  }

  return "unknown";
}

// ==========================================
// CONFIGURATION SUMMARY
// ==========================================

function describeConfiguration() {
  const production = isProduction();

  const mode = production
    ? "production"
    : "sandbox";

  const serverKey = getServerKey();
  const clientKey = getClientKey();

  const serverKeyEnvironment = detectKeyEnvironment(
    serverKey,
    "server"
  );

  const clientKeyEnvironment = detectKeyEnvironment(
    clientKey,
    "client"
  );

  const mismatchedKeys = [];

  if (
    serverKeyEnvironment !== "unknown" &&
    serverKeyEnvironment !== "missing" &&
    serverKeyEnvironment !== mode
  ) {
    mismatchedKeys.push("MIDTRANS_SERVER_KEY");
  }

  if (
    clientKeyEnvironment !== "unknown" &&
    clientKeyEnvironment !== "missing" &&
    clientKeyEnvironment !== mode
  ) {
    mismatchedKeys.push("MIDTRANS_CLIENT_KEY");
  }

  return {
    mode,
    isProduction: production,

    serverKeyPresent: Boolean(serverKey),
    clientKeyPresent: Boolean(clientKey),

    serverKeyEnvironment,
    clientKeyEnvironment,

    environmentMismatch: mismatchedKeys.length > 0,
    mismatchedKeys,
  };
}

// ==========================================
// VALIDATE CONFIGURATION
// ==========================================

function validateConfiguration() {
  const summary = describeConfiguration();
  const issues = [];

  const rawMode = readEnv(
    "MIDTRANS_IS_PRODUCTION"
  ).toLowerCase();

  // 1. Validasi environment
  if (
    rawMode &&
    !VALID_MODE_VALUES.has(rawMode)
  ) {
    issues.push({
      code: "invalid_environment_mode",
      message:
        "Nilai MIDTRANS_IS_PRODUCTION tidak valid",
    });
  }

  // 2. Validasi Server Key
  if (!summary.serverKeyPresent) {
    issues.push({
      code: "missing_server_key",
      message:
        "MIDTRANS_SERVER_KEY belum diset",
    });
  } else if (
    summary.serverKeyEnvironment === "unknown"
  ) {
    issues.push({
      code: "invalid_server_key_format",
      message:
        "Format MIDTRANS_SERVER_KEY tidak dikenali",
    });
  }

  // 3. Validasi Client Key
  if (!summary.clientKeyPresent) {
    issues.push({
      code: "missing_client_key",
      message:
        "MIDTRANS_CLIENT_KEY belum diset",
    });
  } else if (
    summary.clientKeyEnvironment === "unknown"
  ) {
    issues.push({
      code: "invalid_client_key_format",
      message:
        "Format MIDTRANS_CLIENT_KEY tidak dikenali",
    });
  }

  // 4. Validasi kecocokan environment
  if (summary.environmentMismatch) {
    issues.push({
      code: "environment_mismatch",
      message:
        `Format key tidak cocok dengan mode ${summary.mode}: ` +
        summary.mismatchedKeys.join(", "),
      keys: summary.mismatchedKeys,
    });
  }

  return {
    ready: issues.length === 0,
    issues,
    summary,
  };
}

// ==========================================
// CONFIGURATION STATUS
// ==========================================

function isConfigured() {
  return validateConfiguration().ready;
}

// ==========================================
// MIDTRANS CLIENT OPTIONS
// ==========================================

function buildOptions() {
  return {
    isProduction: isProduction(),
    serverKey: getServerKey(),
    clientKey: getClientKey(),
  };
}

// ==========================================
// CLIENT INSTANCE CACHE
// ==========================================

let cachedClients = null;

function getClients() {
  const validation = validateConfiguration();

  if (!validation.ready) {
    const error = new Error(
      "Konfigurasi Midtrans belum valid"
    );

    error.code = "MIDTRANS_CONFIG_INVALID";
    error.issues = validation.issues;

    throw error;
  }

  const options = buildOptions();

  // Gunakan instance lama jika konfigurasi tidak berubah.
  if (
    cachedClients &&
    cachedClients.isProduction === options.isProduction &&
    cachedClients.serverKey === options.serverKey &&
    cachedClients.clientKey === options.clientKey
  ) {
    return cachedClients;
  }

  // Buat instance baru jika konfigurasi berubah.
  cachedClients = {
    isProduction: options.isProduction,
    serverKey: options.serverKey,
    clientKey: options.clientKey,

    snap: new midtransClient.Snap(options),

    coreApi: new midtransClient.CoreApi(options),
  };

  return cachedClients;
}

// ==========================================
// SNAP CLIENT
// ==========================================

function getSnap() {
  return getClients().snap;
}

// ==========================================
// CORE API CLIENT
// ==========================================

function getCoreApi() {
  return getClients().coreApi;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  parseBooleanFlag,

  isProduction,

  getServerKey,
  getClientKey,

  isConfigured,
  describeConfiguration,
  validateConfiguration,

  getSnap,
  getCoreApi,
};
