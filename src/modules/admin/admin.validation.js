import { z } from "zod";

export const templateIdParamSchema = z
  .object({
    template_id: z.string().uuid("Format Template ID harus UUID yang valid!"),
  })
  .strict();
