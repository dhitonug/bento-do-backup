const allowedSources = new Set(["body", "query", "params"]);

export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    try {
      // CEK SOURCE VALID
      if (!allowedSources.has(source)) {
        return res.status(500).json({
          success: false,
          message: `Source validasi tidak dikenali: ${source}`,
        });
      }

      // AMBIL DATA DARI REQUEST
      const payload = req[source] ?? {};

      // VALIDASI DENGAN ZOD
      const result = schema.safeParse(payload);

      // JIKA VALIDASI GAGAL
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error.issues[0]?.message || "Data tidak valid!",
        });
      }

      // TIMPA DATA REQUEST DENGAN HASIL PARSE YANG SUDAH BERSIH
      // Ini penting agar:
      // - type coercion dari Zod dipakai
      // - field asing / tidak dipakai ikut dibersihkan
      if (typeof req[source] === "object" && req[source] !== null) {
        Object.keys(req[source]).forEach((key) => {
          delete req[source][key];
        });

        Object.assign(req[source], result.data);
      } else {
        req[source] = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default validate;