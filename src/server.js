import express from "express";
import dotenv from "dotenv";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import "./utils/scheduler.js"; // Initialize cron jobs

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Hello World! Bento-do API is running.");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
