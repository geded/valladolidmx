import type { ContactVM } from "./types";
import { humanize } from "./format";

export function KitContact({ vm }: { vm: ContactVM }) {
  const inner = (
    <>
      {vm.label ? `${vm.label} · ` : ""}
      {vm.value}
    </>
  );
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Contacto ({humanize(vm.type)})
      </p>
      <p className="mt-1 text-sm text-foreground">
        {vm.href ? (
          <a href={vm.href} className="hover:underline">
            {inner}
          </a>
        ) : (
          inner
        )}
      </p>
    </div>
  );
}