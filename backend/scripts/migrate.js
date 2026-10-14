import path from "node:path";
import { pool } from "../src/db.js";
import { migrateDatabase } from "../src/migrations.js";

try {
  await migrateDatabase(pool, path.resolve("migrations"));
} finally {
  await pool.end();
}
