import type { ReactNode } from "react";

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}