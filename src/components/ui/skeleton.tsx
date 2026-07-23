import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden={props["aria-label"] ? undefined : true}
      data-omxds-visual-foundation="skeleton"
      className={cn("animate-pulse rounded-md bg-primary/10 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
