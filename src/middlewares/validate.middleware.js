export const validate = (schema, target = "body") => (req, res, next) => {
  try {
    const result = schema.parse(req[target]);
    req[target] = result;
    next();
  } catch (err) {
    next(err);
  }
};
