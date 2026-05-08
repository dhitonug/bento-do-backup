export const requireAuth = (req, res, next) => {
  // Mock middleware since actual auth isn't implemented yet.
  // We use a dummy UUID. You will replace this with your real JWT/Session logic.
  req.user = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "mock@example.com"
  };
  next();
};
