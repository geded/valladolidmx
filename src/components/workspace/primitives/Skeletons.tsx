import { cn } from "@/lib/utils";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("ws-shimmer h-3 rounded", className)} aria-hidden />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5",
        className,
      )}
      aria-hidden
    >
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="mt-3 w-full" />
      <SkeletonLine className="mt-2 w-5/6" />
      <div className="mt-4 flex gap-2">
        <SkeletonLine className="h-8 w-20 rounded-full" />
        <SkeletonLine className="h-8 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="ws-shimmer h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}