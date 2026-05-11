import { z } from "zod";

// ENUMS
export const energyWeightEnum = z.enum(["Ringan", "Sedang", "Berat"], {
  errorMap: () => ({
    message: "Bobot energi harus 'Ringan', 'Sedang', atau 'Berat'!",
  }),
});

export const taskStatusEnum = z.enum(["pending", "in_progress", "done"], {
  errorMap: () => ({
    message: "Status hanya boleh 'pending', 'in_progress', atau 'done'!",
  }),
});

// HELPERS
const isoDateTimeSchema = z
  .string({
    invalid_type_error: "Deadline harus berupa teks!",
  })
  .datetime({
    message: "Format deadline harus ISO 8601! Contoh: 2024-12-31T23:59:59Z",
  });

const optionalNullableDeadlineSchema = z.union([isoDateTimeSchema, z.null()]).optional();

const optionalSourceTemplateSchema = z
  .union([
    z
      .string({
        invalid_type_error: "Source template harus berupa teks!",
      })
      .trim()
      .min(1, "Source template tidak boleh kosong!")
      .max(100, "Nama template maksimal 100 karakter!"),
    z.null(),
  ])
  .optional();

// CREATE TASK SCHEMA
export const createTaskSchema = z
  .object({
    title: z
      .string({
        required_error: "Judul tugas wajib diisi!",
        invalid_type_error: "Judul tugas harus berupa teks!",
      })
      .trim()
      .min(3, "Judul tugas minimal 3 karakter!")
      .max(255, "Judul tugas maksimal 255 karakter!"),

    energy_weight: energyWeightEnum,

    deadline: optionalNullableDeadlineSchema,

    source_template: optionalSourceTemplateSchema,
  })
  .strict();

// UPDATE TASK SCHEMA
export const updateTaskSchema = z
  .object({
    title: z
      .string({
        invalid_type_error: "Judul tugas harus berupa teks!",
      })
      .trim()
      .min(3, "Judul tugas minimal 3 karakter!")
      .max(255, "Judul tugas maksimal 255 karakter!")
      .optional(),

    energy_weight: energyWeightEnum.optional(),

    status: taskStatusEnum.optional(),

    deadline: optionalNullableDeadlineSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diisi untuk update tugas!",
  });

// PAGINATION SCHEMA
export const paginationSchema = z
  .object({
    page: z.coerce
      .number({
        invalid_type_error: "Page harus berupa angka!",
      })
      .int("Page harus bilangan bulat!")
      .min(1, "Page minimal 1!")
      .default(1),

    limit: z.coerce
      .number({
        invalid_type_error: "Limit harus berupa angka!",
      })
      .int("Limit harus bilangan bulat!")
      .min(1, "Limit minimal 1!")
      .max(50, "Limit maksimal 50!")
      .default(20),
  })
  .strict();

// TASK ID PARAM SCHEMA
export const taskIdSchema = z
  .object({
    id: z.string().uuid("Format Task ID harus UUID yang valid!"),
  })
  .strict();