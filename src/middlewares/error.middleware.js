// GLOBAL ERROR HANDLING MIDDLEWARE

export const errorMiddleware = (err, req, res, next) => {
  // LOG ERROR

  console.error("ERROR:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // ZOD VALIDATION ERROR

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: err.errors[0]?.message || "Data tidak valid!",
    });
  }

  // POSTGRES UNIQUE VIOLATION

  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "Data sudah ada!",
    });
  }

  // POSTGRES FOREIGN KEY VIOLATION

  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Data referensi tidak ditemukan!",
    });
  }

  // JWT ERRORS

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid!",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token sudah kadaluarsa!",
    });
  }

  // DEFAULT SERVER ERROR

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Terjadi kesalahan pada server.",
  });
};

export default errorMiddleware;
