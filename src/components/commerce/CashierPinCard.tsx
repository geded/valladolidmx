/**
 * Portal → Reservar mesa → Ajustes: PIN y enlace de la pantalla de caja.
 * La caja entra sin cuenta, solo con el PIN, y solo marca mesas.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { isValidCashierPin } from "@/lib/commerce/cashier";

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);
const SITE = "https://www.quehacerenvalladolid.com";

export function CashierPinCard({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const q = useQuery({
    queryKey: ["portal", "cashier-pin", businessId],
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_cashier_pin_status", { _business_id: businessId });
      if (error) throw new Error(error.message);
      return data as { has_pin: boolean; slug: string };
    },
  });
  const link = q.data ? `${SITE}/caja/${q.data.slug}` : "";
  const savePin = async () => {
    if (!isValidCashierPin(pin)) return toast.error("El PIN debe tener de 4 a 6 números.");
    const { error } = await rpc("restaurant_cashier_set_pin", { _business_id: businessId, _pin: pin });
    if (error) return toast.error("No se pudo guardar el PIN.");
    setPin("");
    toast.success("PIN guardado. Las cajas abiertas tendrán que entrar de nuevo.");
    await qc.invalidateQueries({ queryKey: ["portal", "cashier-pin", businessId] });
  };
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h2 className="text-lg">Pantalla de caja</h2>
      <p className="text-sm text-muted-foreground">
        Ábrela en la tableta o computadora de caja. El cajero entra con un PIN, sin tu cuenta, y solo puede marcar mesas
        ocupadas, llegadas sin reservación y mesas libres. Lo que marque se ve al instante en tu agenda y en tu página.
      </p>
      {q.data ? (
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label="Enlace de caja" />
          <Button variant="outline" size="icon" aria-label="Copiar enlace" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success("Enlace copiado"))}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <p className="text-sm">{q.data?.has_pin ? "Ya tienes PIN. Puedes cambiarlo:" : "Crea el PIN de caja (4 a 6 números):"}</p>
      <div className="flex gap-2">
        <Input inputMode="numeric" maxLength={6} value={pin} aria-label="Nuevo PIN de caja"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <Button className="rounded-pill" onClick={() => void savePin()}>Guardar PIN</Button>
      </div>
    </section>
  );
}
