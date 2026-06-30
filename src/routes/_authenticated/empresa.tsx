/**
 * /empresa — Alias del panel de la Empresa turística (Adenda 15.10.4).
 * Redirige al Portal Empresarial existente; la reorganización completa
 * se difiere a fases posteriores de la Etapa 15.10.4.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/empresa")({
  beforeLoad: () => {
    throw redirect({ to: "/portal" });
  },
  component: () => null,
});