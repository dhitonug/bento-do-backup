import { z } from "zod";

export const templateKeys = [
  "makalah",
  "presentasi",
  "praktikum",
  "ujian",
];

export const templateKeyEnum = z.enum(templateKeys, {
  errorMap: () => ({
    message:
      "Template tidak valid! Gunakan salah satu: makalah, presentasi, praktikum, atau ujian.",
  }),
});

export const templateKeyParamSchema = z
  .object({
    template_key: templateKeyEnum,
  })
  .strict();