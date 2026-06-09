import { z } from "zod";

const energyWeightMap = {
  Ringan: "Ringan",
  Sedang: "Sedang",
  Berat: "Berat",
  Easy: "Ringan",
  EASY: "Ringan",
  Low: "Ringan",
  LOW: "Ringan",
  Medium: "Sedang",
  MEDIUM: "Sedang",
  Hard: "Berat",
  HARD: "Berat",
  High: "Berat",
  HIGH: "Berat",
};

export const templateKeyParamSchema = z
  .object({
    template_key: z
      .string({
        required_error: "Template key wajib diisi!",
        invalid_type_error: "Template key harus berupa teks!",
      })
      .trim()
      .min(1, "Template key wajib diisi!")
      .max(120, "Template key maksimal 120 karakter!")
      .regex(/^[a-zA-Z0-9_-]+$/, "Template key tidak valid!"),
  })
  .strict();

export const templateIdParamSchema = z
  .object({
    template_id: z
      .string({
        required_error: "Template id wajib diisi!",
        invalid_type_error: "Template id harus berupa teks!",
      })
      .uuid("Template id tidak valid!"),
  })
  .strict();

const visibilitySchema = z
  .enum(["public", "private", "Public", "Private", "PUBLIC", "PRIVATE", "Custom", "custom"])
  .transform((value) => {
    const normalized = value.toLowerCase();
    return normalized === "custom" || normalized === "private"
      ? "private"
      : "public";
  });

const templateLevelSchema = z
  .enum(["Low", "Medium", "High", "LOW", "MEDIUM", "HIGH"])
  .transform((value) => {
    const normalized = value.toLowerCase();
    if (normalized === "high") return "High";
    if (normalized === "low") return "Low";
    return "Medium";
  });

const energyWeightSchema = z
  .enum(Object.keys(energyWeightMap))
  .transform((value) => energyWeightMap[value]);

export const createTemplateSchema = z
  .object({
    name: z
      .string({
        required_error: "Nama template wajib diisi!",
        invalid_type_error: "Nama template harus berupa teks!",
      })
      .trim()
      .min(1, "Nama template wajib diisi!")
      .max(60, "Nama template maksimal 60 karakter!"),
    description: z
      .string({
        invalid_type_error: "Deskripsi harus berupa teks!",
      })
      .trim()
      .max(500, "Deskripsi maksimal 500 karakter!")
      .optional()
      .default(""),
    visibility: visibilitySchema.default("private"),
    level: templateLevelSchema.default("Medium"),
    items: z
      .array(
        z
          .object({
            title: z
              .string({
                required_error: "Judul task template wajib diisi!",
                invalid_type_error: "Judul task template harus berupa teks!",
              })
              .trim()
              .min(1, "Judul task template wajib diisi!")
              .max(255, "Judul task template maksimal 255 karakter!"),
            description: z
              .string({
                invalid_type_error: "Deskripsi task harus berupa teks!",
              })
              .trim()
              .max(500, "Deskripsi task maksimal 500 karakter!")
              .optional()
              .default(""),
            energy_weight: energyWeightSchema,
          })
          .strict(),
      )
      .min(1, "Minimal tambahkan 1 task template!")
      .max(20, "Maksimal 20 task dalam satu template!"),
  })
  .strict();

export const updateTemplateSchema = createTemplateSchema;
