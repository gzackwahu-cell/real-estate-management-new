"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleNames } from "./role-lookup";
import { landingPathForRoles } from "./roles";
import { loginSchema, type LoginFormState } from "./validation";

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const fieldErrors: NonNullable<LoginFormState["fieldErrors"]> = {};

    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password") {
        fieldErrors[field] ??= issue.message;
      }
    }

    return {
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    // Generic message: do not reveal whether an account exists.
    return { error: "Invalid email or password." };
  }

  // A deactivated profile must not keep a usable session.
  const { data: isActive, error: activeError } = await supabase.rpc(
    "is_profile_active",
  );
  if (activeError || isActive !== true) {
    await supabase.auth.signOut();
    return { error: "Invalid email or password." };
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims?.sub;
  const roles =
    typeof profileId === "string" ? await getRoleNames(supabase) : [];

  redirect(landingPathForRoles(roles));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
