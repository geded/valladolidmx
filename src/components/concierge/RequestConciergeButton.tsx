/**
 * 14.60.2 — Botón "Solicitar concierge".
 * Crea un expediente desde Marketplace o Arma tu Viaje y redirige
 * a /_authenticated/cuenta/concierge.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  createConciergeCaseFromProduct,
  createConciergeCaseFromTravelPlan,
} from "@/lib/concierge/concierge.functions";

type Props =
  | { kind: "product"; productId: string; summary?: string; label?: string }
  | { kind: "travel_plan"; summary: string; label?: string };

export function RequestConciergeButton(props: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fromProduct = useServerFn(createConciergeCaseFromProduct);
  const fromPlan = useServerFn(createConciergeCaseFromTravelPlan);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const label =
    props.label ??
    (props.kind === "product" ? "Solicitar concierge" : "Enviar a mi concierge");

  async function onClick() {
    setErr(null);
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      let caseId: string;
      if (props.kind === "product") {
        caseId = await fromProduct({
          data: { productId: props.productId, summary: props.summary ?? null },
        });
      } else {
        caseId = await fromPlan({ data: { summary: props.summary, items: [] } });
      }
      navigate({
        to: "/cuenta/concierge/$caseId",
        params: { caseId },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo crear el expediente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Creando..." : label}
      </button>
      {err ? <span className="text-[11px] text-destructive">{err}</span> : null}
    </div>
  );
}