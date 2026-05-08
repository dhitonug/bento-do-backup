import { z } from "zod";

export const startSessionSchema = z.object({
  task_id: z.string().uuid("task_id harus berupa UUID yang valid"),
  timer_duration: z
    .number({ required_error: "timer_duration wajib diisi" })
    .int()
    .min(1, "timer_duration minimal 1 menit")
    .max(240, "timer_duration maksimal 240 menit"),
});

export const endSessionSchema = z.object({
  end_reason: z.enum(["completed", "escaped", "zombie_limit", "crash"], {
    required_error: "end_reason wajib diisi",
    invalid_type_error:
      "end_reason harus salah satu dari: completed, escaped, zombie_limit, crash",
  }),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid("ID sesi tidak valid"),
});

export const historyQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10)),
  task_id: z.string().uuid("task_id tidak valid").optional(),
  end_reason: z
    .enum(["completed", "escaped", "zombie_limit", "crash"])
    .optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
