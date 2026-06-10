import { z } from "zod";

export const focusEndReasonEnum = z.enum(
  ["completed", "escaped", "zombie_limit", "crash"],
  {
    errorMap: () => ({
      message:
        "End reason hanya boleh 'completed', 'escaped', 'zombie_limit', atau 'crash'!",
    }),
  },
);

export const startFocusSchema = z
  .object({
    task_id: z.string().uuid("Format Task ID harus UUID yang valid!").optional(),
    taskId: z.string().uuid("Format Task ID harus UUID yang valid!").optional(),
  })
  .strict()
  .refine((data) => data.task_id || data.taskId, {
    message: "Task ID wajib diisi!",
  })
  .transform((data) => ({
    task_id: data.task_id ?? data.taskId,
  }));

export const stopFocusSchema = z
  .object({
    end_reason: focusEndReasonEnum,
  })
  .strict();

export const focusSessionIdParamSchema = z
  .object({
    id: z.string().uuid("Format Focus Session ID harus UUID yang valid!"),
  })
  .strict();
