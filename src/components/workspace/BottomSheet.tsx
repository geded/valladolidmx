/**
 * BottomSheet — wrapper sobre vaul (ya instalado vía shadcn/drawer).
 * Tres snaps: peek / half / full.
 */
import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type SheetSnap = "peek" | "half" | "full";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  snap?: SheetSnap;
  className?: string;
}

const HEIGHT: Record<SheetSnap, string> = {
  peek: "max-h-[30vh]",
  half: "max-h-[60vh]",
  full: "max-h-[92vh]",
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  snap = "half",
  className,
}: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn(HEIGHT[snap], className)}>
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title ? <DrawerTitle className="font-display text-base">{title}</DrawerTitle> : null}
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
        )}
        <div className="overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}