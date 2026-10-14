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
    DB_NAME: "defaultdb",
    DB_USER: "avnadmin",
    DB_PASSWORD: "AVNS_TEST",
    SESSION_SECRET: "development-secret",
  });

  assert.equal(config.nodeEnv, "development");
  assert.deepEqual(config.clientOrigins, ["http://localhost:5173"]);
  assert.equal(config.db.host, "localhost");
  assert.equal(config.db.user, "m_dairy_app");
  assert.equal(config.db.database, "m_dairy");
});
