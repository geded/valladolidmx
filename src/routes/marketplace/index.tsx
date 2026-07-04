/**
 * /marketplace — 301 hacia el hub territorial `/oriente-maya`.
 *
 * US-E3.2 · Fase A (retiro terminología Marketplace). La vitrina
 * canónica ahora vive en `/oriente-maya`. Esta ruta permanece
 * únicamente para preservar backlinks históricos vía 301.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace/")({
  beforeLoad: () => {
    throw redirect({ href: "/oriente-maya", code: 301 });
  },
  component: () => null,
});