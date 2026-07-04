import type { ReactNode } from "react";
import { PublicShell } from "@/components/discovery";
import type { ShellVM } from "./types";

export function KitShell({
  vm,
  children,
}: {
  vm: ShellVM;
  children?: ReactNode;
}) {
  return (
    <PublicShell
      eyebrow={vm.eyebrow}
      title={vm.title}
      description={vm.description}
      crumbs={vm.crumbs?.map((c) => ({ label: c.label, to: c.href }))}
      useContextCrumbs
    >
      {children}
    </PublicShell>
  );
}