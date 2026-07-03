/**
 * /preview/$token — Vista previa pública por token corto (Etapa 15.10.4b · Fase 2)
 *
 * Resuelve un token emitido por `eb_preview_token_issue` (SECURITY DEFINER) y
 * renderiza la composición con el MISMO renderer usado en Studio y producción
 * — garantía de paridad visual 1:1. El token caduca según `_ttl_minutes`.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ebResolvePreview,
  type PreviewPayload,
} from "@/lib/experience-builder/eb-studio.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { buildDemoContext } from "@/lib/experience-builder/dynamic-variables";
import { buildPublicHead } from "@/lib/discovery/seo";

export const Route = createFileRoute("/preview/$token")({
  head: ({ params }) =>
    buildPublicHead({
      title: "Vista previa",
      description: "Vista previa no indexable emitida por token.",
      path: `/preview/${params?.token ?? ""}`,
      noindex: true,
    }),
  component: PreviewView,
});

function PreviewView() {
  const { token } = useParams({ from: "/preview/$token" });
  const resolve = useServerFn(ebResolvePreview);
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await resolve({ data: { token } });
        if (!p) setError("Token inválido o caducado.");
        else setPayload(p);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [token, resolve]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">Vista previa no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!payload) return <div className="p-8 text-sm text-muted-foreground">Cargando vista previa…</div>;

  const style = buildThemeStyle(payload.theme?.tokens);
  return (
    <div className="min-h-screen" style={style}>
      <div className="border-b border-border bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Vista previa · {payload.name} ({payload.kind}) — no indexable, caduca según el token.
      </div>
      <CompositionRenderer tree={payload.tree} variableContext={buildDemoContext()} />
    </div>
  );
}

function buildThemeStyle(tokens?: Record<string, unknown> | null): React.CSSProperties {
  if (!tokens || typeof tokens !== "object") return {};
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v === "string" || typeof v === "number") {
      const cssKey = k.startsWith("--") ? k : `--${k.replace(/_/g, "-")}`;
      style[cssKey] = String(v);
    }
  }
  return style as React.CSSProperties;
}