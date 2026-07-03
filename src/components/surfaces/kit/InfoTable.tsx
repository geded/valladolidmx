import type { InfoTableVM } from "./types";

export function KitInfoTable({ vm }: { vm: InfoTableVM }) {
  if (!vm.rows || vm.rows.length === 0) return null;
  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      {vm.rows.map((row, i) => (
        <div key={`${row.label}-${i}`}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-1 text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}