/**
 * STT público · Voz a texto vía AI Gateway
 *
 * Recibe audio grabado por el viajero y lo transcribe a texto
 * usando Gemini Transcribe. Devuelve SSE con el texto en tiempo real.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const STT_MODEL = "google/gemini-3.5-transcribe";
const MAX_FILE_BYTES = 14 * 1024 * 1024; // 14 MB (Gemini cap)

// Mismo límite de uso que el chat público de Alux (estrategia de suscripción).
const HOUR_LIMIT = 10;
const DAY_LIMIT = 40;

function hashIp(ip: string): string {
  const salt = process.env.ALUX_PUBLIC_IP_SALT ?? process.env.SUPABASE_URL ?? "vmx";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

export const Route = createFileRoute("/api/public/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin") || "";
        const corsOrigin = origin && origin.includes("lovable.app")
          ? origin
          : "https://www.quehacerenvalladolid.com";

        const corsHeaders = {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        };

        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "Transcripción no disponible" }),
            { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        // Límite de uso por visitante (misma estrategia que el chat de Alux).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rate, error: rateErr } = await supabaseAdmin.rpc("alux_public_check_rate", {
          _ip_hash: hashIp(getClientIp(request)),
          _hour_limit: HOUR_LIMIT,
          _day_limit: DAY_LIMIT,
        });
        if (rateErr) {
          return new Response(
            JSON.stringify({ error: "No se pudo verificar el límite de uso" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
        const rateRow = Array.isArray(rate) ? rate[0] : rate;
        if (rateRow && rateRow.allowed === false) {
          return new Response(
            JSON.stringify({
              error: "rate_limited",
              hour_count: rateRow.hour_count,
              day_count: rateRow.day_count,
              hour_limit: HOUR_LIMIT,
              day_limit: DAY_LIMIT,
              message:
                "Has alcanzado el límite de uso de voz por hoy como visitante. Crea tu cuenta gratuita para seguir usando Alux sin límites.",
            }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        // Bound the upload size before buffering
        const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
        if (contentLength > MAX_FILE_BYTES + 1024) {
          return new Response(
            JSON.stringify({ error: "Audio demasiado largo" }),
            { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return new Response(
            JSON.stringify({ error: "Se esperaba multipart/form-data" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const file = formData.get("file");
        if (!(file instanceof File) || !file.size) {
          return new Response(
            JSON.stringify({ error: "Archivo de audio no encontrado" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        if (file.size > MAX_FILE_BYTES) {
          return new Response(
            JSON.stringify({ error: "Audio demasiado largo (máximo 14 MB)" }),
            { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        // Asegurar MIME type audio/* (MediaRecorder puede etiquetar como video/webm)
        let audioFile = file;
        if (!file.type.startsWith("audio/")) {
          audioFile = new File([file], file.name || "recording.webm", { type: "audio/webm" });
        }

        const upstreamForm = new FormData();
        upstreamForm.append("model", STT_MODEL);
        upstreamForm.append("file", audioFile, audioFile.name || "recording.webm");
        upstreamForm.append("response_format", "json");
        upstreamForm.append("stream", "true");

        // Detectar idioma si viene en el form
        const language = formData.get("language");
        if (typeof language === "string" && language) {
          upstreamForm.append("language", language);
        }

        try {
          const upstream = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstreamForm,
            signal: request.signal,
          });

          if (!upstream.ok || !upstream.body) {
            const errText = await upstream.text().catch(() => "");
            console.error(`STT gateway error [${upstream.status}]: ${errText.slice(0, 200)}`);
            return new Response(
              JSON.stringify({ error: "No se pudo transcribir el audio", status: upstream.status }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          // Stream SSE response through unchanged
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Connection": "keep-alive",
              ...corsHeaders,
            },
          });
        } catch (err) {
          if (request.signal.aborted) {
            return new Response(null, { status: 499, headers: corsHeaders });
          }
          console.error("STT fetch error:", err);
          return new Response(
            JSON.stringify({ error: "Error de conexión con el servicio de transcripción" }),
            { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      },
    },
  },
});
