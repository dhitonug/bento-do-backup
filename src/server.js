import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";

import { db } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // TEST DATABASE CONNECTION

    await db.query("SELECT NOW()");

    console.log("✅ Database Connected Successfully!");

    // START SERVER

    app.listen(PORT, () => {
      console.log(`🚀 Bento-do API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);

    process.exit(1);
  }
};

startServer();
