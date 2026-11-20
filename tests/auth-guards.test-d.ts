import type { AuthorizedContext } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";

/**
 * Compile-time regression checks. `npm run typecheck` fails if either
 * @ts-expect-error stops being an error.
 */
async function typeChecks() {
  await withPermission("properties", "view", async (context, supabase) => {
    void context.userId;
    void supabase;

    // @ts-expect-error A forged context must not satisfy the private brand.
    const forged: AuthorizedContext = {
      userId: "forged",
      email: null,
      roles: [],
      isSuperAdmin: false,
    };
    void forged;
  });

  // @ts-expect-error Unknown module names must be rejected.
  await withPermission("not_a_module", "view", async () => undefined);
}

void typeChecks;
