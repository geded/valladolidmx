import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto neutro mientras llega la siguiente página (patrón Airbnb):
 *  portada, título y tarjetas en tonos crema, nunca pantalla en blanco. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando página" className="mx-auto w-full max-w-7xl bg-background px-4 py-6 md:px-8">
      <Skeleton className="aspect-[16/9] w-full rounded-2xl md:aspect-[21/9]" />
      <Skeleton className="mt-6 h-8 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-sm" />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
