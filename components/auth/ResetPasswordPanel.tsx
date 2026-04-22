"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordPanel() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setIsReady(Boolean(data.session));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [supabase.auth]);

  const updatePassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isReady) {
      setErrorMessage("This reset link is no longer valid. Request a new password reset email.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password updated successfully. Redirecting you back into the app...");
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  };

  return (
    <Card className="w-full max-w-lg bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] shadow-2xl shadow-black/20">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a secure password for your SocietyOS account. Once saved, you’ll be signed back into the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">New password</label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirm new password</label>
          <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" />
        </div>
        <Button className="w-full justify-between" onClick={() => void updatePassword()} disabled={isSubmitting || !password || !confirmPassword}>
          {isSubmitting ? "Saving..." : "Update password"}
          <KeyRound className="h-4 w-4" />
        </Button>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
