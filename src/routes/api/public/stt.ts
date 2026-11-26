/**
 * STT público · Voz a texto vía AI Gateway
 *
 * Recibe audio grabado por el viajero y lo transcribe a texto
 * usando Gemini Transcribe. Devuelve SSE con el texto en tiempo real.
 */
import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const STT_MODEL = "google/gemini-3.5-transcribe";
const MAX_FILE_BYTES = 14 * 1024 * 1024; // 14 MB (Gemini cap)
const HOUR_LIMIT = 10;
const DAY_LIMIT = 40;

export const Route = createFileRoute("/api/public/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsOrigin = new URL(request.url).origin;

        const corsHeaders = {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        };

        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        // Validar y acotar la entrada antes de reservar consumo o llamar a IA.
        const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
        if (contentLength > MAX_FILE_BYTES + 1024) {
          return new Response(JSON.stringify({ error: "Audio demasiado largo" }), {
            status: 413,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return new Response(JSON.stringify({ error: "Se esperaba multipart/form-data" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const file = formData.get("file");
        if (!(file instanceof File) || !file.size) {
          return new Response(JSON.stringify({ error: "Archivo de audio no encontrado" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (file.size > MAX_FILE_BYTES) {
          return new Response(JSON.stringify({ error: "Audio demasiado largo (máximo 14 MB)" }), {
            status: 413,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { assertPlatformOrigin, enforcePublicQuota } =
          await import("@/lib/security/public-quota.server");
        try {
          assertPlatformOrigin();
          await enforcePublicQuota("alux.stt", {
            perMinute: 3,
            perHour: HOUR_LIMIT,
            perDay: DAY_LIMIT,
            platformPerDay: 2000,
          });
        } catch (error) {
          const code = error instanceof Error ? error.message : "quota_unavailable";
          const status = code === "origin_not_allowed" ? 403 : code === "rate_limited" ? 429 : 503;
          return new Response(
            JSON.stringify({
              error: status === 429 ? "rate_limited" : code,
              hour_count: 0,
              day_count: 0,
              hour_limit: HOUR_LIMIT,
              day_limit: DAY_LIMIT,
              message:
                status === 429
                  ? "Has alcanzado el límite de uso de voz por hoy como visitante. Inténtalo más tarde."
                  : "No se pudo verificar el acceso al servicio de voz.",
            }),
            { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Transcripción no disponible" }), {
            status: 503,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // MediaRecorder puede etiquetar audio como video/webm.
        let audioFile = file;
        if (!file.type.startsWith("audio/")) {
          audioFile = new File([file], file.name || "recording.webm", { type: "audio/webm" });
        }

        const upstreamForm = new FormData();
        upstreamForm.append("model", STT_MODEL);
        upstreamForm.append("file", audioFile, audioFile.name || "recording.webm");
        upstreamForm.append("response_format", "json");
        upstreamForm.append("stream", "true");
        const language = formData.get("language");
        if (typeof language === "string" && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) {
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
              {
                status: upstream.status,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              },
            );
          }

          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
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
