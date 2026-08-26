import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { PremiumActionVM } from "./types";

export function PremiumAction({
  action,
  variant = "default",
}: {
  action: PremiumActionVM;
  variant?: "default" | "outline";
}) {
  const content = (
    <>
      {action.icon}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild variant={variant} className="rounded-full">
        <Link to={action.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} className="rounded-full" onClick={action.onClick}>
      {content}
    </Button>
  );
}
