/**
 * /insertar/alux — ventana de Alux dentro de la página de un aliado.
 * El host y las pistas proceden de una autorización firmada por el servidor;
 * los parámetros de la URL por sí solos nunca habilitan ni atribuyen el chat.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PublicAluxChat } from "@/components/alux/PublicAluxChat";
import { getAluxEmbedStatus } from "@/lib/alux/channels.functions";
import { useAluxBrand } from "@/lib/brand/brand-context";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/insertar/alux")({
  validateSearch: z.object({
    token: z.string().max(4096).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Alux · Concierge del Oriente Maya" },
      {
        name: "description",
        content:
          "Ventana de Alux, el concierge de Valladolid.mx, dentro de la página de un aliado.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxEmbedPage,
});

function AluxEmbedPage() {
  const { token = "" } = Route.useSearch();
  const alux = useAluxBrand();
  const statusFn = useServerFn(getAluxEmbedStatus);
  const q = useQuery({
    queryKey: ["alux-embed-status", token],
    queryFn: () => statusFn({ data: { token } }),
    enabled: token.length > 0,
    retry: false,
  });
  const verified = q.data?.enabled ? q.data : null;

  /** Dentro del marco, todo enlace se abre en una pestaña nueva. */
  const openLinksOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(a.href, "_blank", "noopener");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background" onClickCapture={openLinksOutside}>
      <main className="min-w-0 flex-1 px-3 py-3">
        {!token || q.data?.enabled === false || q.isError ? (
          <p className="p-4 text-sm text-muted-foreground">
            {alux.name} no está disponible en este sitio por ahora.
          </p>
        ) : !verified ? (
          <div className="min-h-48 animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
        ) : (
          <PublicAluxChat
            embedHost={verified.host}
            embedHint={{ destination: verified.destino, business: verified.empresa }}
          />
        )}
      </main>
      <footer className="px-4 pb-3 text-center text-[11px] text-muted-foreground">
        <a href={SITE.url} className="underline underline-offset-2">
          {alux.name} · concierge de {SITE.name}
        </a>
      </footer>
    </div>
  );
}
