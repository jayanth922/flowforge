import pg from "pg";
import { logger } from "../utils/logger.js";

const pool = new pg.Pool({
  connectionString: process.env["DATABASE_URL"],
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export const connectPostgres = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    logger.info("PostgreSQL connected");
    client.release();
  } catch (err) {
    logger.error({ err }, "PostgreSQL connection failed");
    throw err;
  }
};

export { pool };
