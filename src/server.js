import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

// Memanggil koneksi database 
import { db } from "./config/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// === MIDDLEWARES GLOBAL ===
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello World! (dan selamat datang di API Bento-do)");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
