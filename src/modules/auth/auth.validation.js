import { z } from "zod";

// COMMON SCHEMAS
const emailSchema = z
  .string({
    required_error: "Email wajib diisi!",
    invalid_type_error: "Email harus berupa teks!",
  })
  .trim()
  .min(1, "Email wajib diisi!")
  .email("Format email tidak valid!")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string({
    required_error: "Password wajib diisi!",
    invalid_type_error: "Password harus berupa teks!",
  })
  .min(6, "Password minimal 6 karakter!")
  .max(100, "Password terlalu panjang!");

const displayNameSchema = z
  .string({
    required_error: "Display name wajib diisi!",
    invalid_type_error: "Display name harus berupa teks!",
  })
  .trim()
  .min(3, "Display name minimal 3 karakter!")
  .max(50, "Display name maksimal 50 karakter!");

// REGISTER SCHEMA
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    display_name: displayNameSchema,
  })
  .strict();

// LOGIN SCHEMA
export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

// FORGOT PASSWORD SCHEMA
export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// RESET PASSWORD SCHEMA
export const resetPasswordSchema = z
  .object({
    new_password: passwordSchema,
  })
  .strict();
