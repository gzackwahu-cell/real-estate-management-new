import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email("Enter a valid email address.")
    .max(254, "Email address is too long.")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(200, "Password is too long."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginFormState = {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};
