export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  console.error(`[Error] ${statusCode} - ${message}`, err.stack);

  return res.status(statusCode).json({
    success: false,
    message,
  });
};
