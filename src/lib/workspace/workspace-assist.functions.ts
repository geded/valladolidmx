/**
 * Alux · Asistente interno del área de trabajo (delta mínimo).
 *
 * Responde preguntas del equipo sobre CÓMO FUNCIONA el panel que está
 * viendo (bandejas, etapas, fases de viaje, folios, pagos). No lee datos
 * de viajeros, no ejecuta acciones y no crea memoria: sólo explica el
 * significado de lo que el panel ya muestra, a partir de las
 * definiciones oficiales del propio código.
 *
 * Acceso: sólo personal interno (editor/admin/super_admin o concierge).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONCIERGE_INBOXES } from "@/lib/concierge/case-stage";

const InputSchema = z.object({
  workspaceId: z.string().min(1).max(64),
  workspaceLabel: z.string().min(1).max(120),
  route: z.string().max(200).optional(),
  areas: z.array(z.string().max(80)).max(40).optional(),
  question: z.string().min(1).max(600),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1200),
      }),
    )
    .max(12)
    .optional(),
});

export interface WorkspaceAssistResponse {
  answer: string;
  /** Preguntas sugeridas para continuar. */
  followUps: string[];
  degraded?: boolean;
}

const MODEL = "google/gemini-3-flash-preview";

const CONCIERGE_GLOSSARY = `
CENTRO CONCIERGE — cómo está organizado

Bandejas (agrupadas por Venta, Pago, Viaje y Cierre):
${CONCIERGE_INBOXES.map((i) => `· ${i.label} (grupo ${i.group})`).join("\n")}

Etapa comercial del expediente (se deriva del expediente, sus cotizaciones y su última propuesta):
· Sin asignar — nadie del equipo lo tomó todavía.
· En revisión — se está entendiendo la solicitud del viajero.
· Esperando cotización — se pidió precio a las empresas y falta respuesta.
· Listo para proponer — ya hay cotizaciones suficientes para armar la propuesta.
· Propuesta en preparación — la propuesta existe en borrador, sin enviar.
· Propuesta enviada / Propuesta vista — el viajero ya la recibió o la abrió.
· Requiere ajuste — la rechazó, la retiró o venció: hay que preparar otra.
· Propuesta aceptada / Viaje confirmado y pagado — aceptó; falta o ya ocurrió el cobro.
· Cerrado sin venta / Archivado — sin acciones pendientes.

Fase del viaje (se deriva del pago y de las fechas del viaje):
· En venta — todavía no hay reservación por cobrar.
· Por pagar — aceptó la propuesta y el cobro sigue pendiente.
· Pagado · por viajar — pagado, con fechas futuras.
· Viaja pronto — faltan 7 días o menos para la salida.
· En destino — está viajando en este momento.
· Regresó — el viaje terminó.
· Pagado · sin fechas — pagado pero sin fechas registradas.

Folios de reservación:
· ERL-AAMMDD-### — reservas en línea de experiencias.
· AVL-AAMMDD-### — ventas nacidas de una propuesta de Arma tu Viaje.
· VMX-XXXXXX — folios históricos, anteriores a esa numeración.
La fecha del folio es hora de Mérida y el número es consecutivo del día.

Formas de pago: efectivo (lo marca el equipo al recibirlo) y tarjeta en línea
(se confirma sola cuando el cobro se completa).

Mensajes: las preguntas del viajero se responden desde el expediente, en
"Con el viajero"; "Notas internas" no las ve el viajero.
`.trim();

const SYSTEM = `
Eres Alux, el copiloto interno de Valladolid.mx (Oriente Maya de Yucatán).
Hablas con personal del equipo (concierge, editores, administración).

Tu tarea AHORA es explicar cómo funciona el panel que la persona está viendo:
qué significa cada bandeja, etapa, fase, folio, indicador o acción, y qué
conviene hacer a continuación.

Reglas:
· Responde en español claro, breve y operativo (máximo 6 líneas o 6 viñetas).
· Usa EXCLUSIVAMENTE la información de contexto que recibes. Si algo no está
  ahí, dilo con honestidad y sugiere a quién preguntar. Nunca inventes datos,
  cifras, nombres de viajeros ni funciones que no se mencionen.
· No pidas ni reveles datos personales; no prometas ejecutar acciones: tú
  explicas, la persona actúa en el panel.
· Termina siempre con JSON válido y nada más, con esta forma exacta:
  {"answer":"…","followUps":["…","…"]}
  followUps: 2 o 3 preguntas cortas que la persona podría hacer después.
`.trim();

function fallback(question: string): WorkspaceAssistResponse {
  return {
    answer:
      "Ahora mismo no puedo responder con el asistente. Mientras tanto: las bandejas del Centro Concierge están agrupadas en Venta, Pago, Viaje y Cierre; la etapa indica dónde va la venta y la fase indica dónde va el viaje. Vuelve a intentarlo en un momento.",
    followUps: [
      "¿Qué significa cada bandeja?",
      "¿Cómo leo los folios de reservación?",
      "¿Dónde respondo las preguntas del viajero?",
    ],
    degraded: true,
  };
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export const aluxWorkspaceAssist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<WorkspaceAssistResponse> => {
    // Personal interno únicamente.
    const { data: editorial } = await context.supabase.rpc("is_editor_or_admin", {
      _user_id: context.userId,
    });
    let allowed = Boolean(editorial);
    if (!allowed) {
      for (const role of ["concierge", "concierge_lead"] as const) {
        const { data: has } = await context.supabase.rpc("has_role", {
          _user_id: context.userId,
          _role: role,
        });
        if (has) {
          allowed = true;
          break;
        }
      }
    }
    if (!allowed) throw new Error("forbidden_workspace_assist");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fallback(data.question);

    const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
      import("ai"),
      import("@/lib/ai-gateway.server"),
    ]);

    const contextBlock = [
      `Panel activo: ${data.workspaceLabel} (${data.workspaceId}).`,
      data.route ? `Pantalla actual: ${data.route}.` : null,
      data.areas?.length ? `Secciones del panel: ${data.areas.join(", ")}.` : null,
      data.workspaceId === "concierge" ? CONCIERGE_GLOSSARY : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const historyBlock = (data.history ?? [])
      .map((h) => `${h.role === "user" ? "Persona" : "Alux"}: ${h.content}`)
      .join("\n");

    try {
      const res = await generateText({
        model: createLovableAiGatewayProvider(apiKey)(MODEL),
        system: SYSTEM,
        prompt: [
          `CONTEXTO DEL PANEL\n${contextBlock}`,
          historyBlock ? `CONVERSACIÓN PREVIA\n${historyBlock}` : null,
          `PREGUNTA\n${data.question}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        temperature: 0.3,
        maxOutputTokens: 700,
        abortSignal: AbortSignal.timeout(25_000),
      });
      const parsed = extractJson(res.text ?? "") as
        | { answer?: unknown; followUps?: unknown }
        | null;
      const answer = typeof parsed?.answer === "string" ? parsed.answer.trim() : "";
      if (!answer) return fallback(data.question);
      const followUps = Array.isArray(parsed?.followUps)
        ? parsed.followUps.filter((f): f is string => typeof f === "string").slice(0, 3)
        : [];
      return { answer, followUps };
    } catch (err) {
      console.error(
        "[alux.workspace-assist] proveedor no disponible",
        err instanceof Error ? err.message : err,
      );
      return fallback(data.question);
    }
  });
