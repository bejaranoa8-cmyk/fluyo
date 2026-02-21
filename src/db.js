import "dotenv/config";
import pg from "pg";

const host = (process.env.PGHOST || "").trim();
const user = (process.env.PGUSER || "").trim();
const password = String(process.env.PGPASSWORD || ""); // fuerza string SIEMPRE


const isRenderExternal = host.endsWith(".render.com") || host.includes("render.com");

export const pool = new pg.Pool({
  host,
  port: Number(process.env.PGPORT || 5432),
  database: (process.env.PGDATABASE || "").trim(),
  user,
  password,
  ssl: isRenderExternal ? { rejectUnauthorized: false } : false,
});