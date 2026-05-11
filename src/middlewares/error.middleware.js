export const errorMiddleware = (err, req, res, next) => {
  console.error("ERROR:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    status: err.status,
    code: err.code,
  });

  // ZOD VALIDATION ERROR
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: err.issues?.[0]?.message || "Data tidak valid!",
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

  // POSTGRES INVALID TEXT REPRESENTATION
  // contoh: UUID invalid langsung dari query/database
  if (err.code === "22P02") {
    return res.status(400).json({
      success: false,
      message: "Format data tidak valid!",
    });
  }

  // CUSTOM APP ERROR
  const response = {
    success: false,
    message: err.message || "Terjadi kesalahan pada server.",
  };

  if (err.require_login) {
    response.require_login = true;
  }

  if (err.code && !["23505", "23503", "22P02"].includes(err.code)) {
    response.code = err.code;
  }

  return res.status(err.status || 500).json(response);
};

export default errorMiddleware;