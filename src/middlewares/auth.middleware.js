export const requireAuth = (req, res, next) => {
  req.user = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "mock@example.com",
  };
  next();
};
