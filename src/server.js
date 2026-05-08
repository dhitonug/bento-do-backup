import express from "express";
import dotenv from "dotenv";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import focusRoutes from "./modules/focus/focus.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import "./utils/scheduler.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/notifications", notificationRoutes);
app.use("/api/focus", focusRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Bento-do API is running 🚀", version: "1.0.0" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Bento-do API listening on port ${PORT}`);
});
