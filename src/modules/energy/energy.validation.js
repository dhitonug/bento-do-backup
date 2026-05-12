import { z } from "zod";

export const energyLogsPaginationSchema = z
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