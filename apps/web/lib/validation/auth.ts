import { z } from "zod";

const emailSchema = z.email("invalidEmail");

const loginPasswordSchema = z
  .string()
  .min(1, "passwordRequired")
  .max(256, "passwordInputTooLong");

const registrationPasswordSchema = z
  .string()
  .min(8, "passwordTooShort")
  .max(32, "passwordTooLong");

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: registrationPasswordSchema,
  displayName: z
    .string()
    .min(1, "displayNameRequired")
    .max(50, "displayNameTooLong"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
