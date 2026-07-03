import type { RichTextVM } from "./types";

export function KitRichText({ vm }: { vm: RichTextVM }) {
  const hasBody = !!vm.body && vm.body.trim().length > 0;
  return (
    <section className="mt-10">
      {vm.heading ? (
        <h2 className="text-xl font-semibold">{vm.heading}</h2>
      ) : null}
      {hasBody ? (
        <div className="mt-3 max-w-3xl whitespace-pre-line text-sm text-foreground/85">
          {vm.body}
        </div>
      ) : vm.emptyLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{vm.emptyLabel}</p>
      ) : null}
    </section>
  );
}