import "dotenv/config";

const required = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "SESSION_SECRET",
];
if (process.env.NODE_ENV === "production")
  required.forEach((key) => {
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  });

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "m_dairy_app",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "m_dairy",
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    charset: "utf8mb4",
  },
  sessionSecret: process.env.SESSION_SECRET || "development-only-replace-me",
};
