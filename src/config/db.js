import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const TIMESTAMP_OID = 1114;

pkg.types.setTypeParser(TIMESTAMP_OID, (value) => {
  return new Date(`${value}Z`);
});

const isProduction = process.env.NODE_ENV === "production";
const shouldUseSSL =
  process.env.DB_SSL === "true" ||
  (process.env.DB_SSL !== "false" && isProduction && !!process.env.DATABASE_URL);

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis:
    Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
});

db.on("error", (error) => {
  console.error("UNEXPECTED DATABASE POOL ERROR:", error.message);
});

export default db;
