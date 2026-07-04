/**
 * /marketplace/buscar — 301 hacia el hub territorial.
 *
 * US-E3.2 · Fase A. La búsqueda pública se concentra en `/oriente-maya`
 * (y en las páginas territoriales por destino/categoría). Esta ruta se
 * conserva sólo para 301 de backlinks históricos.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace/buscar")({
  beforeLoad: () => {
    throw redirect({ href: "/oriente-maya", code: 301 });
  },
  component: () => null,
});