import { cn } from "@/utils/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[linear-gradient(90deg,color-mix(in_srgb,var(--surface-2)_90%,transparent),color-mix(in_srgb,var(--surface)_92%,white_8%),color-mix(in_srgb,var(--surface-2)_90%,transparent))] bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "pulse 2.2s ease-in-out infinite" }}
      {...props}
    />
  );
}

export { Skeleton };
