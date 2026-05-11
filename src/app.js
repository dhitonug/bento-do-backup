import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { xss } from "express-xss-sanitizer";
import passport from "passport";

import authRoutes from "./modules/auth/auth.routes.js";
import guestRoutes from "./modules/guest/guest.routes.js";
import taskRoutes from "./modules/tasks/tasks.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import templatesRoutes from "./modules/templates/templates.routes.js";
import focusRoutes from "./modules/focus/focus.routes.js";

import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

app.disable("x-powered-by");

const allowedOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new Error("Origin tidak diizinkan oleh CORS.");
    corsError.status = 403;

    return callback(corsError);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "x-guest-session-token"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xss());
app.use(passport.initialize());

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Hello World! Selamat datang di Bento-do API 🚀",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/guest", guestRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/templates", templatesRoutes);
app.use("/api/v1/focus", focusRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan!",
    path: req.originalUrl,
  });
});

app.use(errorMiddleware);

export default app;