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

const Toaster = React.lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);

export function LazyToasterHost() {
  const [mount, setMount] = React.useState(false);
  React.useEffect(() => subscribeToasterMount(() => setMount(true)), []);
  if (!mount) return null;
  return (
    <React.Suspense fallback={null}>
      <Toaster />
    </React.Suspense>
  );
}