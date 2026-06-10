import { z } from "zod";

const periodEnum = z.enum(["daily", "weekly", "monthly", "yearly"], {
  errorMap: () => ({
    message: "Period hanya boleh 'daily', 'weekly', 'monthly', atau 'yearly'!",
  }),
});

const historyTypeEnum = z.enum(["all", "task", "focus"], {
  errorMap: () => ({
    message: "Type hanya boleh 'all', 'task', atau 'focus'!",
  }),
});

const dateOnlySchema = z
  .string({
    invalid_type_error: "Tanggal harus berupa teks!",
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Format tanggal harus YYYY-MM-DD!",
  });

const paginationFields = {
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
    .max(100, "Limit maksimal 100!")
    .default(20),
};

export const dashboardOverviewQuerySchema = z
  .object({
    period: periodEnum.default("weekly"),
    calendar_date: dateOnlySchema.optional(),
    month: dateOnlySchema.optional(),
  })
  .strict();

export const dashboardHistoryQuerySchema = z
  .object({
    type: historyTypeEnum.default("all"),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    ...paginationFields,
  })
  .strict();
