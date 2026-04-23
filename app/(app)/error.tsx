"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an observability service in production (e.g. Sentry)
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-foreground">Something went wrong</h2>

      <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
        {error.message?.includes("fetch")
          ? "We couldn't load this page — check your connection and try again."
          : "An unexpected error occurred. Our team has been notified."}
      </p>

      {error.digest && (
        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={reset}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button
          onClick={() => (window.location.href = "/dashboard")}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
