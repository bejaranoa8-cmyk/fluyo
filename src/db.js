import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const useDatabaseUrl = !!process.env.DATABASE_URL;

export const pool = new Pool(
  useDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: String(process.env.PGPASSWORD || ""),
        ssl: { rejectUnauthorized: false }, // SIEMPRE SSL en Render
      }
);