import { z } from "zod";

// REGISTER SCHEMA

export const registerSchema = z.object({
  email: z
    .string({
      required_error: "Email wajib diisi!",
      invalid_type_error: "Email harus berupa teks!",
    })
    .email("Format email tidak valid!"),

  password: z
    .string({
      required_error: "Password wajib diisi!",
      invalid_type_error: "Password harus berupa teks!",
    })
    .min(6, "Password minimal 6 karakter!")
    .max(100, "Password terlalu panjang!"),

  display_name: z
    .string({
      required_error: "Display name wajib diisi!",
      invalid_type_error: "Display name harus berupa teks!",
    })
    .min(3, "Display name minimal 3 karakter!")
    .max(50, "Display name maksimal 50 karakter!"),
});

// LOGIN SCHEMA

export const loginSchema = z.object({
  email: z
    .string({
      required_error: "Email wajib diisi!",
      invalid_type_error: "Email harus berupa teks!",
    })
    .email("Format email tidak valid!"),

  password: z
    .string({
      required_error: "Password wajib diisi!",
      invalid_type_error: "Password harus berupa teks!",
    })
    .min(6, "Password minimal 6 karakter!"),
});
