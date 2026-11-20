import { z } from "zod";

const supabasePublicEnvSchema = z.object({
  url: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  anonKey: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

/**
 * Reads only the public Supabase values. Validation is deferred until first use
 * so a missing value gives a clear runtime error instead of breaking the build.
 * No service-role key is ever read here.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const result = supabasePublicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(
      `Supabase is not configured. ${details} Add the values to .env.local (see .env.example).`,
    );
  }

  return result.data;
}
