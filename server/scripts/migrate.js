import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../src/db.js";

const directory = path.resolve("migrations");
const files = (await fs.readdir(directory)).filter((file) => /\.sql$/.test(file)).sort();
await pool.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
);
for (const file of files) {
  const [[alreadyApplied]] = await pool.query(
    "SELECT filename FROM schema_migrations WHERE filename=?",
    [file],
  );
  if (alreadyApplied) continue;
  const sql = await fs.readFile(path.join(directory, file), "utf8");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const statement of sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((value) => value.trim())
      .filter(Boolean))
      await connection.query(statement);
    await connection.query("INSERT INTO schema_migrations(filename) VALUES(?)", [file]);
    await connection.commit();
    console.log(`Applied ${file}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
console.log("Migration complete");
await pool.end();
