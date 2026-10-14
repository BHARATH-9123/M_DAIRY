import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";

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
    normalized.startsWith("example_")
  );
};

const normalizeValue = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text && !isPlaceholderValue(text) ? text : fallback;
};

const parseDatabaseUrl = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || isPlaceholderValue(text)) return null;
  try {
    const url = new URL(text);
    const protocol = url.protocol.replace(":", "");
    if (!["mysql", "mysql2", "mariadb"].includes(protocol)) return null;
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: decodeURIComponent((url.pathname || "/").replace(/^\/+|\/+$/g, "") || ""),
      sslMode: url.searchParams.get("ssl-mode") || url.searchParams.get("ssl_mode") || "",
    };
  } catch {
    return null;
  }
};

export const resolveRuntimeConfig = (env = process.env) => {
  const rawNodeEnv = normalizeValue(env.NODE_ENV, "development");
  const databaseUrl = normalizeValue(
    env.DATABASE_URL,
    normalizeValue(env.DB_URL, normalizeValue(env.DB_DSN, "")),
  );
  const parsedDatabaseUrl = parseDatabaseUrl(databaseUrl);
  const hasPlaceholderDatabaseSettings =
    isPlaceholderValue(env.CLIENT_URL) ||
    isPlaceholderValue(env.DB_HOST) ||
    isPlaceholderValue(env.DB_USER) ||
    isPlaceholderValue(env.DB_NAME) ||
    isPlaceholderValue(env.SESSION_SECRET) ||
    Boolean(parsedDatabaseUrl && isPlaceholderValue(databaseUrl));
  const nodeEnv =
    rawNodeEnv === "production" && hasPlaceholderDatabaseSettings
      ? "development"
      : rawNodeEnv;

  const defaultClientUrl =
    nodeEnv === "production"
      ? "https://mdairy.vercel.app,https://m-dairy.vercel.app"
      : "http://localhost:5173";
  const clientUrl = normalizeValue(env.CLIENT_URL, defaultClientUrl);
  const clientOrigins = clientUrl
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const dbHost = parsedDatabaseUrl?.host || normalizeValue(env.DB_HOST, "localhost");
  const dbPort = Number(parsedDatabaseUrl?.port || normalizeValue(env.DB_PORT, "3306"));
  const dbUser = parsedDatabaseUrl?.user || normalizeValue(env.DB_USER, "m_dairy_app");
  const dbPassword =
    parsedDatabaseUrl && parsedDatabaseUrl.password !== undefined
      ? parsedDatabaseUrl.password
      : normalizeValue(env.DB_PASSWORD, "") || "";
  const dbName = parsedDatabaseUrl?.database || normalizeValue(env.DB_NAME, "m_dairy");
  const remoteDatabase =
    (parsedDatabaseUrl ? parsedDatabaseUrl.host : normalizeValue(env.DB_HOST, "localhost")) !==
      "localhost" &&
    (parsedDatabaseUrl ? parsedDatabaseUrl.host : normalizeValue(env.DB_HOST, "localhost")) !==
      "127.0.0.1" &&
    (parsedDatabaseUrl ? parsedDatabaseUrl.host : normalizeValue(env.DB_HOST, "localhost")) !==
      "::1";
  const sslCa = env.DB_SSL_CA
    ? env.DB_SSL_CA.replace(/\\n/g, "\n")
    : env.DB_SSL_CA_FILE
      ? fs.readFileSync(env.DB_SSL_CA_FILE, "utf8")
      : undefined;
  const sslRejectUnauthorized =
    env.DB_SSL_REJECT_UNAUTHORIZED === "true" ||
    env.DB_SSL_REJECT_UNAUTHORIZED === "1"
      ? true
      : env.DB_SSL_REJECT_UNAUTHORIZED === "false" ||
        env.DB_SSL_REJECT_UNAUTHORIZED === "0"
        ? false
        : Boolean(sslCa);

  if (nodeEnv === "production") {
    const databaseConfigured = Boolean(parsedDatabaseUrl) ||
      [env.DB_HOST, env.DB_PORT, env.DB_NAME, env.DB_USER, env.DB_PASSWORD].every(
        (value) => value && !isPlaceholderValue(value),
      );

    if (!databaseConfigured)
      throw new Error("Missing DB configuration for production");
  }

  const rawSecret = normalizeValue(env.SESSION_SECRET, "");
  const sessionSecret =
    rawSecret && rawSecret.length >= 32
      ? rawSecret
      : (nodeEnv === "production"
          ? crypto.randomBytes(32).toString("hex")
          : "development-only-replace-me");

  return {
    port: Number(normalizeValue(env.PORT, "5000")),
    nodeEnv,
    clientOrigins,
    db: {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: remoteDatabase
        ? {
            minVersion: "TLSv1.2",
            rejectUnauthorized: sslRejectUnauthorized,
            ...(sslCa ? { ca: sslCa } : {}),
          }
        : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      charset: "utf8mb4",
    },
    sessionSecret,
  };
};

export const config = resolveRuntimeConfig();
