import "dotenv/config";
import fs from "node:fs";

const nodeEnv = process.env.NODE_ENV || "development";
const clientOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const remoteDatabase =
  Boolean(process.env.DB_HOST) && process.env.DB_HOST !== "localhost";
const sslCa = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, "\n")
  : process.env.DB_SSL_CA_FILE
    ? fs.readFileSync(process.env.DB_SSL_CA_FILE, "utf8")
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
  ])
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  if (process.env.SESSION_SECRET.length < 32)
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
}

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  clientOrigins,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "m_dairy_app",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "m_dairy",
    ssl: remoteDatabase
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) }
      : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    charset: "utf8mb4",
  },
  sessionSecret: process.env.SESSION_SECRET || "development-only-replace-me",
};
