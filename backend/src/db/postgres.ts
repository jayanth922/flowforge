import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env["DATABASE_URL"],
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export const connectPostgres = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log("[postgres] connected successfully");
    client.release();
  } catch (err) {
    console.error("[postgres] connection failed:", err);
    throw err;
  }
};

export { pool };
