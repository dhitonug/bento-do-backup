import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// membuat koneksi ke postgresql dengan pooling
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Tes koneksi ke Neon.tech
db.connect((err, client, release) => {
  if (err) {
    console.error("❌ Gagal menyambung ke Neon.tech:", err.message);
  } else {
    console.log("✅ Berhasil tersambung ke Database Neon.tech!");
  }
  if (client) release();
});
