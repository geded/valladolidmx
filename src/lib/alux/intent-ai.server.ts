/**
 * IA · Clasificador de intención de viaje (server-only).
 *
 * Mejora la intención determinística (`parseTravelIntent`) con un modelo IA
 * que detecta matices, sinónimos y señales que las expresiones regulares no
 * capturan. Siempre cae al fallback determinista en error/timeout/créditos.
 *
 * Reglas:
 *  · no inventa destinos fuera del conjunto conocido;
 *  · no expone datos personales al modelo;
 *  · timeout duro de 5 s;
 *  · la salida IA se fusiona con la base determinista, nunca la reemplaza
 *    por completo (la base siempre aporta lo que la IA no detecte).
 */
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { AluxTravelIntent } from "./converse-contract";

const IntentSchema = z.object({
  interests: z
    .array(
      z.enum([
        "cultura-maya",
        "gastronomia",
        "naturaleza",
        "hospedaje",
        "casa-vacaciones",
        "experiencias",
        "eventos",
        "rutas",
        "lugares",
        "artesania",
        "familia",
        "pareja",
        "relax",
      ]),
    )
    .max(8),
  company: z.enum(["familia", "pareja", "amigos", "solo"]).nullable(),
  durationDays: z.number().int().min(1).max(60).nullable(),
  timeOfDay: z.enum(["manana", "tarde", "noche"]).nullable(),
  stage: z.enum(["planeando", "en_region"]).nullable(),
  wantsAccessibility: z.boolean(),
  asksHours: z.boolean(),
  asksPrice: z.boolean(),
  asksReplan: z.boolean(),
  asksRemove: z.boolean(),
  mentionedDestinations: z.array(z.string().min(1).max(40)).max(6),
});

const SYSTEM_PROMPT = [
  "Eres un clasificador de intención de viaje para turistas que visitan el Oriente Maya de Yucatán (Valladolid, Izamal, Espita, Uayma, Ek Balam, Río Lagartos, Las Coloradas).",
  "Analiza el mensaje del viajero y extrae SOLO señales de intención de viaje que estén presentes en el texto.",
  "No inventes destinos: sólo marca destinos mencionados explícitamente o por alias claro.",
  "Si una señal no está presente, devuelve null o false según el campo.",
  "Responde en JSON estructurado.",
].join("\n");

export async function enhanceIntentWithAI(
  apiKey: string,
  model: string,
  message: string,
  base: AluxTravelIntent,
  knownDestinationSlugs: readonly string[],
): Promise<AluxTravelIntent> {
  try {
    const provider = createLovableAiGatewayProvider(apiKey);
    const knownList = knownDestinationSlugs.length
      ? `Destinos conocidos: ${knownDestinationSlugs.join(", ")}.`
      : "Sin lista de destinos conocidos.";

    const { output } = await generateText({
      model: provider(model),
      output: Output.object({ schema: IntentSchema }),
      system: SYSTEM_PROMPT,
      prompt: `${knownList}\n\nMensaje del viajero:\n${message}`,
      temperature: 0,
      abortSignal: AbortSignal.timeout(5_000),
    });

    // Fusionar: la IA puede añadir intereses/compañía que el regex no captó,
    // pero la base determinista siempre conserva lo suyo.
    const mergedInterests = Array.from(
      new Set([...base.interests, ...output.interests]),
    ).slice(0, 10);

    const known = new Set(knownDestinationSlugs.map((s) => s.toLowerCase()));
    const mergedDestinations = Array.from(
      new Set([
        ...base.mentionedDestinationSlugs,
        ...output.mentionedDestinations
          .map((d) => d.toLowerCase().replace(/\s+/g, "-"))
          .filter((d) => known.has(d)),
      ]),
    ).slice(0, 6);

    // Mapear intereses a families
    const interestToFamily: Record<string, AluxTravelIntent["families"][number]> = {
      "cultura-maya": "lugar",
      gastronomia: "restaurante",
      naturaleza: "lugar",
      hospedaje: "hotel",
      "casa-vacaciones": "casa",
      experiencias: "experiencia",
      eventos: "evento",
      rutas: "ruta",
      lugares: "lugar",
      artesania: "experiencia",
      relax: "hotel",
    };
    const baseFamilies = new Set(base.families);
    for (const tag of mergedInterests) {
      const f = interestToFamily[tag];
      if (f) baseFamilies.add(f);
    }

    return {
      company: output.company ?? base.company,
      durationDays: output.durationDays ?? base.durationDays,
      timeOfDay: output.timeOfDay ?? base.timeOfDay,
      interests: mergedInterests,
      families: Array.from(baseFamilies),
      wantsAccessibility: base.wantsAccessibility || output.wantsAccessibility,
      asksHours: base.asksHours || output.asksHours,
      asksPrice: base.asksPrice || output.asksPrice,
      asksReplan: base.asksReplan || output.asksReplan,
      asksRemove: base.asksRemove || output.asksRemove,
      stage: output.stage ?? base.stage,
      mentionedDestinationSlugs: mergedDestinations,
    };
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      console.warn("[alux.intent-ai] AI enhancement failed, using deterministic intent:", error);
    }
    return base;
  }
}
