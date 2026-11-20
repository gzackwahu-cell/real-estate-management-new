import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/brand-panel";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Secure sign in for Danwell staff, tenants and property owners.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <BrandPanel />

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Staff &amp; portal access
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-danwell-navy">
            Sign in to Danwell
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the account provided by the agency. Public sign-up is disabled.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Access is private. Tenants, owners and staff see only the information
            permitted for their role.
          </p>
        </div>
      </section>
    </main>
  );
}
