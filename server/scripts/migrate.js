import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../src/db.js";

const directory = path.resolve("migrations");
const files = (await fs.readdir(directory)).filter((file) => /\.sql$/.test(file)).sort();
const requiredTables = [
  "users",
  "business_settings",
  "parties",
  "attendance",
  "bills",
  "bill_lines",
  "payments",
  "bill_revisions",
  "schema_migrations",
];
async function missingTables(connection) {
  const placeholders = requiredTables.map(() => "?").join(",");
  const [rows] = await connection.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN (${placeholders})`,
    requiredTables,
  );
  const found = new Set(rows.map((row) => row.table_name));
  return requiredTables.filter((table) => !found.has(table));
}
await pool.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
);
const connection = await pool.getConnection();
try {
  const [[lock]] = await connection.query("SELECT GET_LOCK('m_dairy_schema_migration', 30) acquired");
  if (Number(lock.acquired) !== 1)
    throw new Error("Another schema migration is already running");
  for (const file of files) {
    const [[alreadyApplied]] = await connection.query(
      "SELECT filename FROM schema_migrations WHERE filename=?",
      [file],
    );
    const missing = await missingTables(connection);
    if (alreadyApplied && !missing.length) continue;
    const sql = await fs.readFile(path.join(directory, file), "utf8");
    let applied = false;
    try {
      for (const statement of sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((value) => value.trim())
        .filter(Boolean))
        await connection.query(statement);
      if (!alreadyApplied)
        await connection.query("INSERT INTO schema_migrations(filename) VALUES(?)", [file]);
      applied = true;
      console.log(`${alreadyApplied ? "Repaired schema with" : "Applied"} ${file}`);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
    if (!applied) throw new Error(`Migration ${file} did not complete`);
  }
  const missing = await missingTables(connection);
  if (missing.length)
    throw new Error(`Schema verification failed; missing tables: ${missing.join(", ")}`);
  console.log("Migration and schema verification complete");
} finally {
  try {
    await connection.query("SELECT RELEASE_LOCK('m_dairy_schema_migration')");
  } finally {
    connection.release();
  }
}
await pool.end();
