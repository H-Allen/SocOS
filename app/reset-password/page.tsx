import { ResetPasswordPanel } from "@/components/auth/ResetPasswordPanel";

export default function ResetPasswordPage() {
  return (
    <main className="bg-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">SocietyOS security</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">Reset your password</h1>
          <p className="mt-3 text-base text-[var(--text-secondary)]">
            Use the secure session from your recovery email to set a new password and get back into your workspace.
          </p>
        </div>
        <div className="flex justify-center">
          <ResetPasswordPanel />
        </div>
      </div>
    </main>
  );
}
