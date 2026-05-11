import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import { db } from "./config/db.js";

const PORT = Number(process.env.PORT) || 5000;

let server;

const shutdown = async (signal) => {
  console.log(`\n⚠️ Menerima sinyal ${signal}. Menutup server dengan aman...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            return reject(error);
          }

          resolve();
        });
      });
    }

    await db.end();
    console.log("✅ Server dan koneksi database berhasil ditutup.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal shutdown dengan aman:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await db.query("SELECT NOW()");
    console.log("✅ Database connected successfully!");

    server = app.listen(PORT, () => {
      console.log(`🚀 Bento-do API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  shutdown("uncaughtException");
});

startServer();