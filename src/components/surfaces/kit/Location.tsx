import type { LocationVM } from "./types";

export function KitLocation({ vm }: { vm: LocationVM }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Ubicacion
      </p>
      <p className="mt-1 text-sm text-foreground">
        {vm.label ? (
          <>
            <span className="font-medium">{vm.label}</span>
            <br />
          </>
        ) : null}
        {vm.addressLine1}
        {vm.addressLine2 ? `, ${vm.addressLine2}` : ""}
      </p>
    </div>
  );
}