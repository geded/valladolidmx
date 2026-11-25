/**
 * Comparte «Reservar mesa»: enlace corto (WhatsApp, redes) y código para
 * pegar en la web propia. Todo aterriza en la misma página y calendario de
 * Valladolid.mx, así las reservaciones quedan en una sola agenda.
 */
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { businessShortPath } from "@/lib/navigation/short-links";
import { TABLE_BOOKING_ANCHOR } from "@/lib/commerce/hotel-venue";

const SITE = "https://www.quehacerenvalladolid.com";

export function tableBookingShareLink(categorySlug: string, businessSlug: string): string {
  return `${SITE}${businessShortPath(categorySlug, businessSlug)}#${TABLE_BOOKING_ANCHOR}`;
}

export function tableBookingEmbedCode(link: string, name: string): string {
  const safe = name.replace(/[<>&"]/g, "");
  return `<a href="${link}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b07a2a;color:#fff;font:600 15px/1.2 system-ui,sans-serif;text-decoration:none" aria-label="Reservar mesa en ${safe}">Reservar mesa</a>`;
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiado`);
  } catch {
    toast.error("No se pudo copiar; selecciónalo y cópialo a mano.");
  }
}

export function ShareTableBookingCard({ businessId }: { businessId: string }) {
  const q = useQuery({
    queryKey: ["portal", "table-booking-share", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, slug, status, business_categories!businesses_primary_category_id_fkey ( slug )")
        .eq("id", businessId)
        .maybeSingle();
      return data;
    },
  });
  const b = q.data;
  const category = (b?.business_categories as { slug?: string } | null)?.slug;
  if (!b || !b.slug || !category) return null;
  const link = tableBookingShareLink(category, b.slug);
  const code = tableBookingEmbedCode(link, b.name ?? "");
  const wa = `https://wa.me/?text=${encodeURIComponent(`Reserva tu mesa en ${b.name}: ${link}`)}`;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg">Comparte tu botón de reservas</h2>
        <p className="text-sm text-muted-foreground">
          Envía este enlace por WhatsApp, Instagram o Facebook, o pega el código en tu página web. Todas las
          reservaciones llegan a esta misma agenda.
        </p>
        {b.status !== "published" ? (
          <p className="mt-2 text-sm text-warning">Tu ficha aún no está publicada; el enlace funcionará cuando se publique.</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Enlace corto</p>
        <p className="break-all rounded-lg bg-muted/40 p-2 text-sm">{link}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="rounded-pill" onClick={() => copy(link, "Enlace")}><Copy className="mr-1 h-4 w-4" />Copiar enlace</Button>
          <Button size="sm" variant="outline" className="rounded-pill" asChild>
            <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" />Enviar por WhatsApp</a>
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Código para tu página web</p>
        <textarea readOnly rows={4} value={code} className="w-full rounded-lg border border-border bg-muted/30 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button size="sm" variant="outline" className="rounded-pill" onClick={() => copy(code, "Código")}><Copy className="mr-1 h-4 w-4" />Copiar código</Button>
      </div>
    </section>
  );
}
