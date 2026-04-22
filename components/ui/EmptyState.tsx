"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-6 py-16">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-[var(--surface)]">
          <Icon className="h-12 w-12 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
        {action ? (
          <Button className="mt-6" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
