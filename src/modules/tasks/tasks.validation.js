import { z } from "zod";

// ENERGY WEIGHT ENUM

const energyWeightValues = ["Ringan", "Sedang", "Berat"];

// CREATE TASK SCHEMA

export const createTaskSchema = z.object({
  title: z
    .string({
      required_error: "Judul tugas wajib diisi!",
      invalid_type_error: "Judul tugas harus berupa teks!",
    })
    .min(3, "Judul tugas minimal 3 karakter!")
    .max(255, "Judul tugas maksimal 255 karakter!"),

  energy_weight: z
    .string({
      required_error: "Bobot energi wajib diisi!",
      invalid_type_error: "Bobot energi harus berupa teks!",
    })
    .refine((value) => energyWeightValues.includes(value), {
      message: "Bobot energi harus 'Ringan', 'Sedang', atau 'Berat'!",
    }),

  deadline: z
    .string({
      required_error: "Deadline wajib diisi!",
      invalid_type_error: "Deadline harus berupa teks!",
    })
    .datetime({
      message: "Format deadline harus ISO 8601! Contoh: 2024-12-31T23:59:59Z",
    })
    .optional(),

  source_template: z
    .string({
      invalid_type_error: "Source template harus berupa teks!",
    })
    .max(100, "Nama template maksimal 100 karakter!")
    .optional()
    .nullable(),
});

// UPDATE TASK SCHEMA

export const updateTaskSchema = z.object({
  title: z
    .string({
      invalid_type_error: "Judul tugas harus berupa teks!",
    })
    .min(3, "Judul tugas minimal 3 karakter!")
    .max(255, "Judul tugas maksimal 255 karakter!")
    .optional(),

  energy_weight: z
    .string({
      invalid_type_error: "Bobot energi harus berupa teks!",
    })
    .refine((value) => energyWeightValues.includes(value), {
      message: "Bobot energi harus 'Ringan', 'Sedang', atau 'Berat'!",
    })
    .optional(),

  status: z
    .string({
      invalid_type_error: "Status harus berupa teks!",
    })
    .refine((value) => ["pending", "in_progress", "done"].includes(value), {
      message: "Status hanya boleh 'pending', 'in_progress', atau 'done'!",
    })
    .optional(),

  deadline: z
    .string({
      invalid_type_error: "Deadline harus berupa teks!",
    })
    .datetime({
      message: "Format deadline harus ISO 8601! Contoh: 2024-12-31T23:59:59Z",
    })
    .optional()
    .nullable(),
});

// PAGINATION SCHEMA

export const paginationSchema = z.object({
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
});

// TASK ID PARAM SCHEMA (TAMBAHAN)

export const taskIdSchema = z.object({
  id: z.string().uuid("Format Task ID harus UUID yang valid!"),
});
