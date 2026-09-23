/**
 * TTS público · Texto a voz vía AI Gateway
 *
 * Convierte texto en audio streaming SSE usando Gemini TTS.
 * Diseñado para que Alux y fichas se puedan escuchar en voz alta.
 */
import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/speech";
const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";
const TTS_VOICE = "Kore";
const MAX_CHARS = 4000;

export const Route = createFileRoute("/api/public/tts")({
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
          "Cache-Control": "no-cache",
        };

        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "TTS no disponible" }),
            { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        let body: { text?: string; locale?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "JSON inválido" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const text = (body.text ?? "").trim();
        if (!text) {
          return new Response(
            JSON.stringify({ error: "Texto vacío" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        if (text.length > MAX_CHARS) {
          return new Response(
            JSON.stringify({ error: `Texto demasiado largo (máximo ${MAX_CHARS} caracteres)` }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const ttsBody = {
          model: TTS_MODEL,
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
            },
          },
          stream_format: "sse",
        };

        try {
          const upstream = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ttsBody),
            signal: request.signal,
          });

          if (!upstream.ok || !upstream.body) {
            const errText = await upstream.text().catch(() => "");
            console.error(`TTS gateway error [${upstream.status}]: ${errText.slice(0, 200)}`);
            return new Response(
              JSON.stringify({ error: "No se pudo generar audio", status: upstream.status }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          // Stream the SSE response through unchanged
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              ...corsHeaders,
            },
          });
        } catch (err) {
          if (request.signal.aborted) {
            return new Response(null, { status: 499, headers: corsHeaders });
          }
          console.error("TTS fetch error:", err);
          return new Response(
            JSON.stringify({ error: "Error de conexión con el servicio de voz" }),
            { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      },
    },
  },
});
