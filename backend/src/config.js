import "dotenv/config";
import fs from "node:fs";

const isPlaceholderValue = (value) => {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return true;
  const normalized = text.toLowerCase();
  return (
    normalized.startsWith("your_") ||
    normalized.includes("replace_with") ||
    normalized.includes("change_me") ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("defaultdb") ||
    normalized.includes("avnadmin") ||
    normalized.startsWith("avns_")
  );
};

const normalizeValue = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text && !isPlaceholderValue(text) ? text : fallback;
};

export const resolveRuntimeConfig = (env = process.env) => {
  const rawNodeEnv = normalizeValue(env.NODE_ENV, "development");
  const hasPlaceholderDatabaseSettings =
    isPlaceholderValue(env.CLIENT_URL) ||
    isPlaceholderValue(env.DB_HOST) ||
    isPlaceholderValue(env.DB_USER) ||
    isPlaceholderValue(env.DB_NAME) ||
    isPlaceholderValue(env.SESSION_SECRET);
  const nodeEnv =
    rawNodeEnv === "production" && hasPlaceholderDatabaseSettings
      ? "development"
      : rawNodeEnv;

  const clientUrl = normalizeValue(env.CLIENT_URL, "http://localhost:5173");
  const clientOrigins = clientUrl
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const remoteDatabase =
    Boolean(normalizeValue(env.DB_HOST, "localhost")) &&
    normalizeValue(env.DB_HOST, "localhost") !== "localhost";
  const sslCa = env.DB_SSL_CA
    ? env.DB_SSL_CA.replace(/\\n/g, "\n")
    : env.DB_SSL_CA_FILE
      ? fs.readFileSync(env.DB_SSL_CA_FILE, "utf8")
      : undefined;

  if (nodeEnv === "production") {
    for (const key of [
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USER",
      "DB_PASSWORD",
      "SESSION_SECRET",
      "CLIENT_URL",
    ]) {
      const value = env[key];
      if (!value || isPlaceholderValue(value))
        throw new Error(`Missing ${key}`);
    }
    if (env.SESSION_SECRET.length < 32)
      throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }

  return {
    port: Number(normalizeValue(env.PORT, "5000")),
    nodeEnv,
    clientOrigins,
    db: {
      host: normalizeValue(env.DB_HOST, "localhost"),
      port: Number(normalizeValue(env.DB_PORT, "3306")),
      user: normalizeValue(env.DB_USER, "m_dairy_app"),
      password: normalizeValue(env.DB_PASSWORD, "") || "",
      database: normalizeValue(env.DB_NAME, "m_dairy"),
      ssl: remoteDatabase
        ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) }
        : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      charset: "utf8mb4",
    },
    sessionSecret: normalizeValue(env.SESSION_SECRET, "development-only-replace-me"),
  };
};

export const config = resolveRuntimeConfig();
