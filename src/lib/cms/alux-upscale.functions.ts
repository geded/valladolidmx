/**
 * cms/alux-upscale.functions.ts — Asistente "Alux IA" de ampliación de fotos.
 *
 * Reglas:
 *  · Sólo editores y administradores (`is_editor_or_admin`). Nunca el Portal
 *    Empresarial ni superficies públicas.
 *  · Nunca automático: se ejecuta cuando el editor lo solicita explícitamente
 *    porque la foto elegida queda por debajo del tamaño recomendado del uso.
 *  · No sustituye al original en la Biblioteca: devuelve bytes al cliente, que
 *    sigue el mismo ingreso gobernado (original inmutable + variantes).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALUX_UPSCALE_MODEL = "google/gemini-3.1-flash-image";
/** Techo defensivo de entrada (bytes del archivo ya optimizado en cliente). */
const MAX_INPUT_BYTES = 6 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

interface UpscaleInput {
  bytesBase64: string;
  mime: string;
  width: number;
  height: number;
  targetLongSide: number;
  /** Uso destino, sólo para contextualizar el prompt. */
  roleLabel?: string;
  /**
   * `upscale` amplía a mayor resolución; `editorial` da un afinado editorial
   * (luz, color, contraste y nitidez) sin alterar la escena.
   */
  mode?: "upscale" | "editorial";
}

export const aluxUpscaleImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpscaleInput) => {
    if (!d?.bytesBase64 || !d?.mime) throw new Error("invalid_input");
    if (!Number.isFinite(d.width) || !Number.isFinite(d.height)) throw new Error("invalid_input");
    if (!Number.isFinite(d.targetLongSide) || d.targetLongSide <= 0) {
      throw new Error("invalid_input");
    }
    if (!d.mime.startsWith("image/")) throw new Error("invalid_input");
    // base64 ≈ 4/3 del tamaño real.
    if (d.bytesBase64.length * 0.75 > MAX_INPUT_BYTES) throw new Error("image_too_large");
    return { ...d, mode: d.mode === "editorial" ? ("editorial" as const) : ("upscale" as const) };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("missing_lovable_api_key");

    const prompt = (
      data.mode === "editorial"
        ? [
            "Dale un acabado editorial de revista de viajes a esta fotografía, conservando exactamente la misma escena.",
            data.roleLabel ? `Uso previsto: ${data.roleLabel}.` : "",
            "Corrige exposición y balance de blancos, recupera detalle en luces y sombras, da color natural y cálido propio de Yucatán, y aporta nitidez y limpieza profesional.",
            "No cambies el encuadre, la composición, la arquitectura, las personas, los rótulos ni ningún elemento visible. Nada de filtros artificiales, HDR exagerado, saturación irreal, objetos nuevos, texto, marcas de agua ni bordes.",
          ]
        : [
      "Amplía esta fotografía a mayor resolución conservando exactamente la misma escena.",
      `Tamaño objetivo aproximado: ${data.targetLongSide} px en el lado mayor (original ${data.width}×${data.height} px).`,
      data.roleLabel ? `Uso previsto: ${data.roleLabel}.` : "",
      "Reconstruye detalle y nitidez de forma realista. No cambies el encuadre, la composición, los colores, las personas, los rótulos ni ningún elemento visible.",
      "No añadas objetos, texto, marcas de agua ni bordes.",
          ]
    )
      .filter(Boolean)
      .join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: ALUX_UPSCALE_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${data.mime};base64,${data.bytesBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("alux_rate_limited");
      if (res.status === 402) throw new Error("alux_credits_required");
      if (res.status === 403) throw new Error("alux_blocked");
      throw new Error(`alux_gateway_error[${res.status}]: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("alux_empty_response");

    return {
      ok: true as const,
      model: ALUX_UPSCALE_MODEL,
      mime: "image/png",
      bytesBase64: b64,
    };
  });
