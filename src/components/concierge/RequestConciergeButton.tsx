/**
 * 14.60.2 — Botón "Solicitar concierge".
 * Crea un expediente desde Marketplace o Arma tu Viaje y redirige
 * a /_authenticated/cuenta/concierge.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  createConciergeCaseFromProduct,
  createConciergeCaseFromTravelPlan,
} from "@/lib/concierge/concierge.functions";
import { useProtectedAction } from "@/lib/protected-actions";

type Props =
  | { kind: "product"; productId: string; summary?: string; label?: string }
  | { kind: "travel_plan"; summary: string; label?: string };

export function RequestConciergeButton(props: Props) {
  const navigate = useNavigate();
  const fromProduct = useServerFn(createConciergeCaseFromProduct);
  const fromPlan = useServerFn(createConciergeCaseFromTravelPlan);
  const [err, setErr] = useState<string | null>(null);

  const label =
    props.label ??
    (props.kind === "product" ? "Solicitar concierge" : "Enviar a mi concierge");

  const protectedRun = useProtectedAction<void, string>({
    kind:
      props.kind === "product"
        ? "concierge.request_from_product"
        : "concierge.request_from_travel_plan",
    reason: props.kind === "product" ? "product" : "travel_plan",
    gateCopy: {
      title: "Inicia sesión para continuar",
      description:
        "Tu expediente de concierge se crea en tu cuenta para que puedas darle seguimiento.",
      primaryCta: "Iniciar sesión",
      dismissCta: "Ahora no",
    },
    action: async () => {
      if (props.kind === "product") {
        return await fromProduct({
          data: { productId: props.productId, summary: props.summary ?? null },
        });
      }
      return await fromPlan({ data: { summary: props.summary, items: [] } });
    },
    onSuccess: (caseId) => {
      setErr(null);
      navigate({ to: "/cuenta/concierge/$caseId", params: { caseId } });
    },
    onError: (e) => {
      setErr(e instanceof Error ? e.message : "No se pudo crear el expediente.");
    },
  });

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => {
          setErr(null);
          protectedRun.run();
        }}
        disabled={protectedRun.pending}
        className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {protectedRun.pending ? "Creando..." : label}
      </button>
      {err ? <span className="text-[11px] text-destructive">{err}</span> : null}
    </div>
  );
}