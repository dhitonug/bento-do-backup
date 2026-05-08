export const success = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const paginated = (res, data, meta, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const error = (res, message = "Internal Server Error", statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};
