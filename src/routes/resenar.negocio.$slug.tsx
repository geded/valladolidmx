/**
 * Ola 6 · Reseña verificada post-canje.
 * Destino del CTA "Deja tu reseña" en el email `coupon-redeemed`.
 *
 * Resuelve el negocio por slug (público) y abre `ReviewComposer` con la
 * política que corresponde (idealmente `verified_redemption`).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { resolveBusinessBySlug } from "@/lib/reviews/resolve-business.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/resenar/negocio/$slug")({
  head: () => ({
    meta: [
      { title: "Deja tu reseña · Valladolid.mx" },
      { name: "description", content: "Comparte tu experiencia después de canjear tu cupón." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewRoute,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p className="text-destructive">No pudimos abrir el formulario de reseña.</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg p-6 text-center">
      <p>No encontramos esta empresa.</p>
      <Button asChild className="mt-4"><Link to="/">Volver al inicio</Link></Button>
    </div>
  ),
});

function ReviewRoute() {
  const { slug } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();
  const resolve = useServerFn(resolveBusinessBySlug);
  const q = useQuery({
    queryKey: ["resenar-negocio", slug],
    queryFn: () => resolve({ data: { slug } }),
  });

  if (authLoading || q.isLoading) {
    return <div className="mx-auto max-w-lg p-6 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <h1 className="text-xl font-semibold">Inicia sesión para dejar tu reseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Necesitamos verificar tu identidad para publicar reseñas verificadas.
        </p>
        <Button asChild className="mt-4">
          <Link to="/auth" search={{ redirect: `/resenar/negocio/${slug}` } as never}>
            Iniciar sesión
          </Link>
        </Button>
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <p>No encontramos esta empresa.</p>
        <Button asChild className="mt-4"><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Comparte tu experiencia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {q.data.display_name} · reseña verificada por canje de cupón.
      </p>
      <div className="mt-6">
        <ReviewComposer
          subjectKind="business"
          subjectId={q.data.id}
          subjectName={q.data.display_name}
          defaultOpen
          hideTrigger={false}
          triggerLabel="Abrir formulario de reseña"
        />
      </div>
    </div>
  );
}