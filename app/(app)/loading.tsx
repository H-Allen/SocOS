export default function AppLoading() {
  return (
    <div className="min-h-screen animate-pulse px-6 py-6">
      {/* Navbar skeleton */}
      <div className="mb-6 flex h-14 items-center justify-between rounded-2xl border border-border bg-[var(--surface)] px-6">
        <div className="h-4 w-36 rounded-full bg-[var(--surface-2)]" />
        <div className="h-8 w-8 rounded-full bg-[var(--surface-2)]" />
      </div>

      {/* Hero card skeleton */}
      <div className="mb-6 h-28 rounded-[28px] border border-border bg-[var(--surface)]" />

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left column skeletons */}
        <div className="space-y-6 xl:col-span-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl border border-border bg-[var(--surface)]"
            />
          ))}
        </div>

        {/* Right column skeletons */}
        <div className="space-y-6 xl:col-span-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-border bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
