/**
 * LazyToasterHost — H2·P3 · C1 (Lazy Toaster Spike)
 *
 * Monta el `<Toaster />` real de sonner únicamente cuando el shim
 * `@/lib/toast` señala que se ha solicitado un toast (o cuando alguien
 * llama a `prefetchToaster()`). Antes de ese momento renderiza `null`
 * y por lo tanto no ejecuta el `import()` dinámico del Toaster,
 * dejando fuera del entry a `sonner` completo.
 */
import * as React from "react";
import { subscribeToasterMount } from "@/lib/toast";

type ToasterMod = typeof import("@/components/ui/sonner");

export function LazyToasterHost() {
  const [mount, setMount] = React.useState(false);
  const [Cmp, setCmp] = React.useState<ToasterMod["Toaster"] | null>(null);

  React.useEffect(() => subscribeToasterMount(() => setMount(true)), []);

  React.useEffect(() => {
    if (!mount || Cmp) return;
    let alive = true;
    void import("@/components/ui/sonner").then((m) => {
      if (alive) setCmp(() => m.Toaster);
    });
    return () => {
      alive = false;
    };
  }, [mount, Cmp]);

  if (!mount || !Cmp) return null;
  return <Cmp />;
}