import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Sensitive data access must go through lib/auth/guards.ts. This is a
    // supporting check; the branded AuthorizedContext is the primary guard.
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/auth/**", "lib/supabase/server.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              message:
                "Use lib/auth/guards.ts so authorization runs before data access.",
            },
            {
              name: "@/lib/supabase/server.ts",
              message:
                "Use lib/auth/guards.ts so authorization runs before data access.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
