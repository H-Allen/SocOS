"use client";

import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck, UserPlus } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { firebaseAuth } from "@/lib/firebase/client";

type AuthPanelProps = {
  nextPath: string;
};

type SignInForm = {
  email: string;
  password: string;
};

type SignUpForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function AuthPanel({ nextPath }: AuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useMemo(() => firebaseAuth, []);
  const [signInForm, setSignInForm] = useState<SignInForm>({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState<SignUpForm>({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [isSubmitting, setIsSubmitting] = useState<"signin" | "signup" | "reset" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(searchParams.get("error") === "auth_callback_failed" ? "We couldn't complete authentication. Please try again." : null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting("signin");

    try {
      const credential = await signInWithEmailAndPassword(auth, signInForm.email.trim(), signInForm.password);
      const idToken = await credential.user.getIdToken();
      const session = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!session.ok) {
        throw new Error("Could not create a secure SocietyOS session.");
      }
    } catch (error) {
      setIsSubmitting(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not sign in.");
      return;
    }

    setIsSubmitting(null);
    router.push(nextPath as Route);
    router.refresh();
  };

  const signUp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (signUpForm.password.length < 8) {
      setErrorMessage("Use a password with at least 8 characters.");
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting("signup");

    try {
      const credential = await createUserWithEmailAndPassword(auth, signUpForm.email.trim(), signUpForm.password);
      await updateProfile(credential.user, { displayName: signUpForm.fullName.trim() });
      await sendEmailVerification(credential.user);

      const idToken = await credential.user.getIdToken(true);
      const session = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!session.ok) {
        throw new Error("Could not create a secure SocietyOS session.");
      }
    } catch (error) {
      setIsSubmitting(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not create your account.");
      return;
    }

    setIsSubmitting(null);
    router.push("/onboarding");
    router.refresh();
  };

  const sendReset = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting("reset");

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim(), {
        url: `${window.location.origin}/reset-password`
      });
    } catch (error) {
      setIsSubmitting(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not send reset email.");
      return;
    }

    setIsSubmitting(null);
    setSuccessMessage("Password reset email sent. Check your inbox for the secure reset link.");
  };

  return (
    <Card className="bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] shadow-2xl shadow-black/20">
      <CardHeader>
        <CardTitle>Sign in to SocietyOS</CardTitle>
        <CardDescription>
          Secure authentication is powered by Firebase Auth with server-verified sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
            <TabsTrigger value="reset">Reset password</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={signInForm.email}
                  onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="you@university.ac.uk"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={signInForm.password}
                  onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Enter your password"
                />
              </div>
              <Button className="w-full justify-between" onClick={() => void signIn()} disabled={isSubmitting === "signin" || !signInForm.email.trim() || !signInForm.password}>
                {isSubmitting === "signin" ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full name</label>
                <Input
                  value={signUpForm.fullName}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Alex Morgan"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={signUpForm.email}
                  onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="you@university.ac.uk"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    value={signUpForm.password}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm password</label>
                  <Input
                    type="password"
                    value={signUpForm.confirmPassword}
                    onChange={(event) => setSignUpForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Repeat password"
                  />
                </div>
              </div>
              <Button
                className="w-full justify-between"
                onClick={() => void signUp()}
                disabled={
                  isSubmitting === "signup" ||
                  !signUpForm.fullName.trim() ||
                  !signUpForm.email.trim() ||
                  !signUpForm.password ||
                  !signUpForm.confirmPassword
                }
              >
                {isSubmitting === "signup" ? "Creating account..." : "Create account"}
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reset">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@university.ac.uk" />
              </div>
              <Button className="w-full justify-between" onClick={() => void sendReset()} disabled={isSubmitting === "reset" || !resetEmail.trim()}>
                {isSubmitting === "reset" ? "Sending..." : "Send reset link"}
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-[var(--surface-2)] p-4">
            <Mail className="h-4 w-4 text-primary" />
            <p className="mt-3 text-sm font-medium text-foreground">Email confirmation ready</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Firebase sends verification emails for new accounts automatically.</p>
          </div>
          <div className="rounded-xl border border-border bg-[var(--surface-2)] p-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="mt-3 text-sm font-medium text-foreground">Secure sessions by default</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Protected routes are server-checked and session cookies are refreshed through middleware.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
