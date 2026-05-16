import { z } from "zod";

export const notificationTypeEnum = z.enum(
  ["deadline_reminder", "energy_critical", "dopamine_rescue"],
  {
    errorMap: () => ({
      message:
        "Tipe notifikasi hanya boleh 'deadline_reminder', 'energy_critical', atau 'dopamine_rescue'!",
    }),
  },
);

export const notificationIdParamSchema = z
  .object({
    id: z.string().uuid("Format Notification ID harus UUID yang valid!"),
  })
  .strict();

export const getNotificationsQuerySchema = z
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

    is_read: z
      .enum(["true", "false"], {
        errorMap: () => ({
          message: "Filter is_read hanya boleh 'true' atau 'false'!",
        }),
      })
      .optional()
      .transform((value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return undefined;
      }),

    type: notificationTypeEnum.optional(),
  })
  .strict();