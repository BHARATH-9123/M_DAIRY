import app from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { migrateDatabase } from "./migrations.js";

await migrateDatabase(pool);
app.listen(config.port, () =>
  console.log(`M-DAIRY API listening on ${config.port}`),
);
