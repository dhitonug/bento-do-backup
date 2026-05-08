export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    // VALIDATE DATA

    const result = schema.safeParse(req[source]);

    // VALIDATION FAILED

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.issues[0]?.message || "Data tidak valid!",
      });
    }

    // REPLACE CLEAN DATA

    if (source === "query") {
      // Untuk query, jangan replace objeknya, tapi update propertinya
      Object.keys(result.data).forEach((key) => {
        req[source][key] = result.data[key];
      });
    } else {
      // Untuk body dan params, bisa langsung replace
      req[source] = result.data;
    }

    next();
  };
