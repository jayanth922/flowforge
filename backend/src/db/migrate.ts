import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./postgres.js";
import type pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const ensureMigrationsTable = async (client: pg.PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename     VARCHAR(255) PRIMARY KEY,
      executed_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `);
};

const getAppliedMigrations = async (
  client: pg.PoolClient,
): Promise<Set<string>> => {
  const result = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  return new Set(result.rows.map((r: { filename: string }) => r.filename));
};

const applyMigration = async (
  client: pg.PoolClient,
  filename: string,
  sql: string,
): Promise<void> => {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [filename],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
};

const run = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skipped (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, "utf-8");

      await applyMigration(client, file, sql);
      console.log(`[migrate] applied: ${file}`);
      count++;
    }

    const skipped = files.length - count;
    console.log(
      `[migrate] done — ${count} migration(s) applied, ${skipped} already up to date`,
    );
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
