/**
 * /marketplace — 301 hacia el hub territorial `/oriente-maya`.
 *
 * US-E3.3 · Retiro de código legacy. La carpeta `src/routes/marketplace/`
 * fue eliminada; conservamos únicamente dos rutas planas para preservar
 * backlinks históricos vía redirect permanente.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace")({
  beforeLoad: () => {
    throw redirect({ href: "/oriente-maya", code: 301 });
  },
  component: () => null,
});