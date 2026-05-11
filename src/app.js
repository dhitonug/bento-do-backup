import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { xss } from "express-xss-sanitizer";
import passport from "passport";

// IMPORT ROUTES
import authRoutes from "./modules/auth/auth.routes.js";
import guestRoutes from "./modules/guest/guest.routes.js";
import taskRoutes from "./modules/tasks/tasks.routes.js";

// IMPORT ERROR MIDDLEWARE
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

// BASIC HARDENING
app.disable("x-powered-by");

// CORS CONFIG
const allowedOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // izinkan Postman / mobile app / request tanpa origin
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

// GLOBAL MIDDLEWARES
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xss());
app.use(passport.initialize());

// ROOT ENDPOINT
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Hello World! Selamat datang di Bento-do API 🚀",
  });
});

// API ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/guest", guestRoutes);
app.use("/api/v1/tasks", taskRoutes);

// 404 HANDLER
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan!",
    path: req.originalUrl,
  });
});

// GLOBAL ERROR HANDLER
app.use(errorMiddleware);

export default app;