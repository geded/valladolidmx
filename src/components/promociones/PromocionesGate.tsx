/**
 * PromocionesGate — Gate suave sobre `/promociones`.
 *
 * Objetivo: presionar registro + perfil público completo sin romper el
 * descubrimiento (SEO/inspiración). Las tarjetas se ven; al hacer click
 * los viajeros sin perfil público reciben un modal que explica los
 * beneficios y los lleva a completarlo. Sin cupón todavía (Ola 1).
 */
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Sparkles, QrCode, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyPublicProfile } from "@/lib/traveler/traveler-public.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CouponIssueDialog } from "./CouponIssueDialog";

type GateStatus = "guest" | "incomplete" | "eligible" | "loading";

function useGateStatus(): GateStatus {
  const { user, loading } = useAuth();
  const fetchProfile = useServerFn(getMyPublicProfile);
  const enabled = !loading && !!user;
  const { data, isLoading } = useQuery({
    queryKey: ["promo-gate", user?.id],
    queryFn: () => fetchProfile(),
    enabled,
    staleTime: 60_000,
  });
  if (loading) return "loading";
  if (!user) return "guest";
  if (isLoading) return "loading";
  return data?.is_public ? "eligible" : "incomplete";
}

export function PromocionesGate({ children }: { children: ReactNode }) {
  const status = useGateStatus();
  const [open, setOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponTarget, setCouponTarget] = useState<{
    slug: string;
    title: string | null;
  } | null>(null);
  const eligible = status === "eligible";

  const handleCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (status === "loading") return;
    const target = e.target as HTMLElement;
    // Sólo interceptamos clicks sobre enlaces/botones de tarjeta.
    const link = target.closest("a, button");
    if (!link) return;
    // Deja pasar botones de favorito (data attr propio del FavoriteButton).
    if (link.closest("[data-favorite-button]")) return;
    e.preventDefault();
    e.stopPropagation();
    if (eligible) {
      // Extraer slug desde el href de la landing (`/l/<slug>`).
      const anchor = link.closest("a") as HTMLAnchorElement | null;
      const href = anchor?.getAttribute("href") ?? "";
      const match = href.match(/\/l\/([^/?#]+)/);
      const slug = match ? match[1] : null;
      if (!slug) return;
      const card = target.closest("[data-tourism-card]") as HTMLElement | null;
      const title =
        card?.querySelector("[data-tourism-card-title]")?.textContent?.trim() ??
        anchor?.textContent?.trim() ??
        null;
      setCouponTarget({ slug, title });
      setCouponOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      {!eligible && status !== "loading" ? (
        <GateBanner status={status} onOpen={() => setOpen(true)} />
      ) : null}

      <div onClickCapture={handleCapture}>{children}</div>

      <UnlockDialog status={status} open={open} onOpenChange={setOpen} />
      <CouponIssueDialog
        open={couponOpen}
        onOpenChange={setCouponOpen}
        promotionSlug={couponTarget?.slug ?? null}
        promotionTitle={couponTarget?.title ?? null}
      />
    </div>
  );
}

function GateBanner({
  status,
  onOpen,
}: {
  status: GateStatus;
  onOpen: () => void;
}) {
  const isGuest = status === "guest";
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {isGuest
                ? "Regístrate y completa tu perfil público para desbloquear las promociones"
                : "Completa tu perfil público para desbloquear las promociones"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Los descuentos del Oriente Maya son exclusivos para viajeros
              con perfil público completo. Así los negocios saben que eres un
              viajero real y te reservan la promoción a ti.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpen}
          className="w-full shrink-0 sm:w-auto"
        >
          {isGuest ? "Registrarme" : "Completar mi perfil"}
        </Button>
      </div>
    </div>
  );
}

function UnlockDialog({
  status,
  open,
  onOpenChange,
}: {
  status: GateStatus;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const isGuest = status === "guest";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Lock className="size-6" aria-hidden />
          </div>
          <DialogTitle className="text-center">
            Promoción bloqueada
          </DialogTitle>
          <DialogDescription className="text-center">
            Los descuentos son exclusivos para viajeros del Oriente Maya con
            perfil público completo. Es la forma de proteger la promoción
            para quienes realmente viajan con nosotros.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <UserCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Viajero verificado.</strong>{" "}
              El negocio sabe que eres un viajero real, no alguien que sólo
              vio el descuento en internet.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <QrCode className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Cupón digital personal
              (próximamente).</strong>{" "}
              Con QR y tus datos, para presentarlo desde tu celular al
              llegar. Nadie más puede usarlo.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Alux te recomienda mejor.</strong>{" "}
              Con tu perfil completo, tus promos aparecen ordenadas por tu
              estilo de viaje, presupuesto e intereses.
            </span>
          </li>
        </ul>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Ahora no
          </Button>
          {isGuest ? (
            <Button asChild>
              <Link
                to="/auth"
                search={{ next: "/cuenta/perfil-publico" } as never}
              >
                Registrarme
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/cuenta/perfil-publico">Completar mi perfil</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}