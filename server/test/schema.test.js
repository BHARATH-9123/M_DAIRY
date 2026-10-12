import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const migration = fs.readFileSync(
  new URL("../migrations/001_initial.sql", import.meta.url),
  "utf8",
);
const revisionMigration = fs.readFileSync(
  new URL("../migrations/002_bill_revisions.sql", import.meta.url),
  "utf8",
);
const migrationScript = fs.readFileSync(
  new URL("../scripts/migrate.js", import.meta.url),
  "utf8",
);
test("schema preserves attendance and bill uniqueness", () => {
  assert.match(migration, /UNIQUE KEY one_attendance_per_day/);
  assert.match(migration, /UNIQUE KEY one_bill_per_month/);
  assert.match(migration, /DECIMAL\(12,2\)/);
});
test("schema retains financial relationships", () => {
  assert.match(migration, /FOREIGN KEY \(party_id\)/);
  assert.match(migration, /FOREIGN KEY \(bill_id\)/);
});
test("bill recalculation preserves a revision history", () => {
  assert.match(revisionMigration, /CREATE TABLE IF NOT EXISTS bill_revisions/);
  assert.match(revisionMigration, /previous_lines JSON NOT NULL/);
  assert.match(revisionMigration, /FOREIGN KEY \(bill_id\)/);
});
test("migration script verifies the required production schema", () => {
  assert.match(migrationScript, /GET_LOCK\('m_dairy_schema_migration', 30\)/);
  assert.match(migrationScript, /information_schema\.tables/);
  assert.match(migrationScript, /Schema verification failed/);
  assert.match(migrationScript, /"users"/);
});
