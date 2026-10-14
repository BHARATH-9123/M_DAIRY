import test from "node:test";
import assert from "node:assert/strict";
import { resolveRuntimeConfig } from "../src/config.js";

test("development settings fall back to local defaults when production placeholders are present", () => {
  const config = resolveRuntimeConfig({
    NODE_ENV: "production",
    PORT: "5000",
    CLIENT_URL: "YOUR_AIVEN_HOSTNAME",
    DB_HOST: "YOUR_AIVEN_HOSTNAME",
    DB_PORT: "26403",
    DB_NAME: "your_database_name",
    DB_USER: "YOUR_AIVEN_USERNAME",
    DB_PASSWORD: "YOUR_AIVEN_PASSWORD",
    SESSION_SECRET: "development-secret",
  });

  assert.equal(config.nodeEnv, "development");
  assert.deepEqual(config.clientOrigins, ["http://localhost:5173"]);
  assert.equal(config.db.host, "localhost");
  assert.equal(config.db.user, "m_dairy_app");
  assert.equal(config.db.database, "m_dairy");
});

test("accepts a real Aiven MySQL URL without forcing local defaults", () => {
  const config = resolveRuntimeConfig({
    NODE_ENV: "production",
    PORT: "5000",
    CLIENT_URL: "https://m-dairy.onrender.com",
    DATABASE_URL:
      "mysql://testadmin:super_test_pass_987654@mysql-demo.aivencloud.com:24193/defaultdb?ssl-mode=REQUIRED",
    SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  });

  assert.equal(config.nodeEnv, "production");
  assert.deepEqual(config.clientOrigins, ["https://m-dairy.onrender.com"]);
  assert.equal(config.db.host, "mysql-demo.aivencloud.com");
  assert.equal(config.db.port, 24193);
  assert.equal(config.db.user, "testadmin");
  assert.equal(config.db.password, "super_test_pass_987654");
  assert.equal(config.db.database, "defaultdb");
  assert.deepEqual(config.db.ssl, {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  });
});
