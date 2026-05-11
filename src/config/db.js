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

// IMPORT ERROR MIDDLEWARE (TAMBAHAN)

import errorMiddleware from "./middlewares/error.middleware.js";

// CREATE APP

const app = express();

// GLOBAL MIDDLEWARES

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "x-guest-session-token", 
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

app.use(helmet());
app.use(xss());
app.use(passport.initialize());

// ROOT ENDPOINT

app.get("/", (req, res) => {
  res.send("Hello World! Selamat datang di Bento-do API 🚀");
});

// API ROUTES

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/guest", guestRoutes);
app.use("/api/v1/tasks", taskRoutes);

// ERROR HANDLING MIDDLEWARE (TAMBAHAN)

app.use(errorMiddleware);

// 404 HANDLER

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan!",
  });
});

export default app;
