"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting until mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex h-10 w-full items-center justify-between rounded-xl border border-border bg-[var(--surface-2)] p-1", className)}>
        <div className="h-full flex-1 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-10 w-full items-center justify-between rounded-xl border border-border bg-[var(--surface-2)] p-1", className)}>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex h-full flex-1 items-center justify-center rounded-lg transition-all",
          theme === "light" ? "bg-background text-foreground shadow-sm" : "text-[var(--text-secondary)] hover:text-foreground"
        )}
        aria-label="Light theme"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "flex h-full flex-1 items-center justify-center rounded-lg transition-all",
          theme === "system" ? "bg-background text-foreground shadow-sm" : "text-[var(--text-secondary)] hover:text-foreground"
        )}
        aria-label="System theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex h-full flex-1 items-center justify-center rounded-lg transition-all",
          theme === "dark" ? "bg-background text-foreground shadow-sm" : "text-[var(--text-secondary)] hover:text-foreground"
        )}
        aria-label="Dark theme"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
