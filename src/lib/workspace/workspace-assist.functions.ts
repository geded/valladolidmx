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
import {
  CONCIERGE_INBOXES,
  deriveCaseStage,
  deriveTripPhase,
  type CaseFollowUp,
} from "@/lib/concierge/case-stage";

const InputSchema = z.object({
  workspaceId: z.string().min(1).max(64),
  workspaceLabel: z.string().min(1).max(120),
  route: z.string().max(200).optional(),
  areas: z.array(z.string().max(80)).max(40).optional(),
  question: z.string().min(1).max(600),
  /** Ficha, expediente o reservación abierta en la pantalla activa. */
  subject: z
    .object({
      kind: z.enum(["order", "case", "entity"]),
      id: z.string().max(80).optional(),
      label: z.string().max(160).optional(),
      status: z.string().max(40).optional(),
      fields: z.array(z.string().max(80)).max(60).optional(),
    })
    .optional(),
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

const CMS_GLOSSARY = `
CMS STUDIO — cómo se llena una ficha

Estado de publicación (en este orden): Borrador → En revisión → Aprobado →
Publicado → Archivado. Sólo lo publicado se ve en el sitio; cada cambio de
estado queda registrado con autor y hora de Mérida.

Qué se espera de los campos comunes:
· Nombre / Título — nombre real con el que se conoce el lugar, empresa,
  producto o evento. Sin mayúsculas completas, sin adjetivos publicitarios,
  sin la ciudad repetida si ya está en el destino.
· Slug — parte final de la dirección web. Minúsculas, sin acentos, con
  guiones. Una vez publicado conviene no cambiarlo; si se cambia, el sistema
  guarda una redirección para no perder el posicionamiento.
· Resumen / Descripción corta — una o dos frases (unos 160 caracteres) que
  digan qué es y por qué vale la pena. Se usa en tarjetas, buscadores y
  redes sociales.
· Descripción larga — de dónde viene, qué se vive ahí, qué lo hace distinto,
  qué conviene saber antes de ir. Escribir con voz propia de Oriente Maya:
  cálida, concreta, sin frases genéricas de folleto.
· Destino / Zona / Región — ubican la ficha en el territorio y arman las
  migas de pan y las recomendaciones cercanas. No dejar en blanco.
· Categorías y atributos — sirven para los filtros del visitante; elegir sólo
  las que aplican de verdad.
· Ubicación (latitud y longitud) — obligatoria: sin ella no se calcula la
  distancia ni aparece en los mapas, y la ficha no debe publicarse.
· Portada, galería y logotipo — se eligen desde la Biblioteca de imágenes;
  el sistema las optimiza solo. Imagen horizontal y nítida para portada.
· Texto alternativo de la imagen — describe lo que se ve, para quien no puede
  verla y para buscadores.
· Horarios, contacto y precios — datos reales y verificables. Si no se
  conocen, dejar vacío antes que suponer.
· SEO (título y descripción) — si se dejan vacíos se generan del contenido;
  título corto con el nombre y el destino.

Reglas de contenido: nunca inventar datos, precios, teléfonos ni horarios;
no copiar textos de otros sitios; no repetir el mismo texto en varias fichas.
Para publicar hace falta, como mínimo: nombre, resumen, destino, ubicación e
imagen de portada.
`.trim();

/** Formato de dinero en pesos, sin depender del navegador. */
function money(amount: number, currency: string) {
  // Los importes se guardan en centavos, igual que en la pantalla de reservaciones.
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

const FOLIO_RE = /\b((?:ERL|AVL|VMX)[-\s]?[A-Za-z0-9]{2,8}(?:[-\s]?\d{1,3})?)\b/i;

/**
 * Lee una reservación real (folio, expediente u orden abierta) con el cliente
 * autenticado del propio usuario: la RLS vigente decide qué puede ver.
 * Sólo lectura; nunca escribe ni ejecuta acciones.
 */
async function reservationContext(
  supabase: any,
  opts: { folio?: string; orderId?: string; caseId?: string },
): Promise<string | null> {
  const columns =
    "id, folio, source_kind, source_case_id, traveler_name, traveler_email, traveler_phone, destination_name, editorial_title, status, payment_provider, paid_at, created_at, total_amount, currency, travel_plan_id";
  let query = supabase.from("concierge_orders").select(columns);
  if (opts.orderId) query = query.eq("id", opts.orderId);
  else if (opts.folio) query = query.ilike("folio", opts.folio.replace(/[%,]/g, ""));
  else if (opts.caseId) query = query.eq("source_case_id", opts.caseId);
  else return null;

  const { data: order, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !order) {
    if (opts.folio) return `RESERVACIÓN CONSULTADA\nNo existe ninguna reservación con el folio "${opts.folio}" visible para esta persona.`;
    return null;
  }

  const [{ data: items }, { data: plan }, { data: kase }] = await Promise.all([
    supabase
      .from("concierge_order_items")
      .select("title, quantity, subtotal_amount, currency")
      .eq("order_id", order.id)
      .limit(12),
    order.travel_plan_id
      ? supabase
          .from("travel_plans")
          .select("start_date, end_date")
          .eq("id", order.travel_plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    order.source_case_id
      ? supabase
          .from("concierge_cases")
          .select("id, status, assigned_concierge_user_id")
          .eq("id", order.source_case_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: proposal } = order.source_case_id
    ? await supabase
        .from("concierge_proposals")
        .select("status, sent_at")
        .eq("case_id", order.source_case_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const followUp: CaseFollowUp = {
    case_id: order.source_case_id ?? order.id,
    quotes_requested: 0,
    quotes_submitted: 0,
    quotes_other: 0,
    latest_proposal_status: proposal?.status ?? null,
    latest_proposal_sent_at: proposal?.sent_at ?? null,
    order_status: order.status,
    order_paid_at: order.paid_at,
    assigned_concierge_user_id: kase?.assigned_concierge_user_id ?? null,
    assigned_concierge_name: null,
    trip_start_date: plan?.start_date ?? null,
    trip_end_date: plan?.end_date ?? null,
  };
  const stage = deriveCaseStage({
    status: kase?.status ?? (order.paid_at ? "closed_won" : "open"),
    assigned_concierge_user_id: followUp.assigned_concierge_user_id,
    followUp,
  });
  const phase = deriveTripPhase({ status: kase?.status ?? "open", stage, followUp });

  const paymentLabel = !order.paid_at
    ? "Sin pago registrado"
    : order.payment_provider === "cash"
      ? "Pagado en efectivo"
      : order.payment_provider === "demo"
        ? "Pago de demostración"
        : "Pagado en línea con tarjeta";

  await fillTravelerContacts(supabase, [order]);

  return [
    "RESERVACIÓN CONSULTADA (dato real, sólo lectura)",
    `· Folio: ${order.folio} — ${order.source_kind === "direct_sale" ? "reserva en línea de experiencia" : "venta de Arma tu Viaje"}.`,
    `· Creada: ${order.created_at?.slice(0, 10) ?? "—"} (hora de Mérida).`,
    order.traveler_name ? `· Viajero: ${order.traveler_name}.` : null,
    order.traveler_phone
      ? `· Teléfono / WhatsApp: ${order.traveler_phone} — enlace directo: https://wa.me/${String(order.traveler_phone).replace(/\D/g, "")}`
      : "· Teléfono no registrado en la reservación.",
    order.traveler_email ? `· Correo: ${order.traveler_email}.` : "· Correo no registrado en la reservación.",
    order.destination_name ? `· Destino: ${order.destination_name}.` : null,
    order.editorial_title ? `· Título: ${order.editorial_title}.` : null,
    `· Estado de la reservación: ${order.status}.`,
    `· Pago: ${paymentLabel}${order.paid_at ? ` el ${order.paid_at.slice(0, 10)}` : ""}.`,
    `· Importe total: ${money(Number(order.total_amount ?? 0), order.currency ?? "MXN")}.`,
    followUp.trip_start_date
      ? `· Fechas del viaje: del ${followUp.trip_start_date} al ${followUp.trip_end_date ?? followUp.trip_start_date}.`
      : "· Sin fechas de viaje registradas.",
    `· Etapa comercial: ${stage.label}. ${stage.nextAction}`,
    `· Fase del viaje: ${phase.label}. ${phase.detail}`,
    (items ?? []).length
      ? `· Conceptos: ${(items ?? [])
          .map(
            (i: { title: string; quantity: number; subtotal_amount: number; currency: string }) =>
              `${i.title} ×${i.quantity} (${money(Number(i.subtotal_amount ?? 0), i.currency ?? "MXN")})`,
          )
          .join("; ")}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}


/**
 * Panorama reciente de reservaciones (sólo lectura, RLS del propio usuario).
 * Permite responder "¿quién pagó al último?", "¿cuáles faltan por cobrar?".
 */
/**
 * Completa nombre/teléfono/correo del viajero cuando la reservación se guardó sin
 * esos datos: se resuelven desde el expediente y el perfil del viajero (RLS vigente).
 */
async function fillTravelerContacts(supabase: any, orders: any[]): Promise<void> {
  const caseIds = Array.from(
    new Set(
      orders
        .filter((o) => !o.traveler_name || !o.traveler_phone || !o.traveler_email)
        .map((o) => o.source_case_id)
        .filter(Boolean),
    ),
  );
  if (!caseIds.length) return;

  const { data: cases } = await supabase
    .from("concierge_cases")
    .select("id, traveler_user_id")
    .in("id", caseIds);
  const userByCase = new Map<string, string>();
  for (const k of (cases ?? []) as any[]) {
    if (k.traveler_user_id) userByCase.set(k.id, k.traveler_user_id);
  }
  const userIds = Array.from(new Set(userByCase.values()));
  if (!userIds.length) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, email, phone")
    .in("user_id", userIds);
  const profileByUser = new Map<string, any>();
  for (const p of (profiles ?? []) as any[]) profileByUser.set(p.user_id, p);

  for (const o of orders) {
    const userId = o.source_case_id ? userByCase.get(o.source_case_id) : undefined;
    const p = userId ? profileByUser.get(userId) : undefined;
    if (!p) continue;
    const name =
      p.display_name ||
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
      null;
    if (!o.traveler_name && name) o.traveler_name = name;
    if (!o.traveler_phone && p.phone) o.traveler_phone = p.phone;
    if (!o.traveler_email && p.email) o.traveler_email = p.email;
  }
}

async function recentReservationsContext(supabase: any): Promise<string | null> {
  const columns =
    "folio, source_kind, source_case_id, traveler_name, traveler_phone, traveler_email, destination_name, status, payment_provider, paid_at, created_at, total_amount, currency";

  const [{ data: paid }, { data: pending }] = await Promise.all([
    supabase
      .from("concierge_orders")
      .select(columns)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(8),
    supabase
      .from("concierge_orders")
      .select(columns)
      .is("paid_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const line = (o: any, withDate: "paid" | "created") =>
    [
      `· ${o.folio}`,
      o.traveler_name ? `— ${o.traveler_name}` : "— sin nombre registrado",
      o.destination_name ? `(${o.destination_name})` : null,
      `· ${money(Number(o.total_amount ?? 0), o.currency ?? "MXN")}`,
      withDate === "paid"
        ? `· pagado ${o.paid_at?.slice(0, 10) ?? "—"} (${
            o.payment_provider === "cash"
              ? "efectivo"
              : o.payment_provider === "demo"
                ? "demostración"
                : "tarjeta en línea"
          })`
        : `· creada ${o.created_at?.slice(0, 10) ?? "—"} · sin pago`,
      o.traveler_phone
        ? `· tel ${o.traveler_phone} (https://wa.me/${String(o.traveler_phone).replace(/\D/g, "")})`
        : null,
      o.traveler_email ? `· ${o.traveler_email}` : null,
    ]
      .filter(Boolean)
      .join(" ");

  const paidRows = (paid ?? []) as any[];
  const pendingRows = (pending ?? []) as any[];
  if (!paidRows.length && !pendingRows.length) return null;

  await fillTravelerContacts(supabase, [...paidRows, ...pendingRows]);

  const latest = paidRows[0];

  return [
    "RESERVACIONES RECIENTES (datos reales, sólo lectura). Las listas ya vienen ordenadas de más reciente a más antigua: NO reordenes por tu cuenta.",
    latest
      ? `El pago MÁS RECIENTE es el folio ${latest.folio} — ${latest.traveler_name ?? "sin nombre registrado"} — ${money(Number(latest.total_amount ?? 0), latest.currency ?? "MXN")} — ${latest.paid_at?.slice(0, 10) ?? "—"}. Si te preguntan quién pagó al último, responde con ese folio.`
      : null,
    paidRows.length
      ? `Últimas pagadas (de más reciente a más antigua):\n${paidRows.map((o) => line(o, "paid")).join("\n")}`
      : "Últimas pagadas: todavía no hay reservaciones pagadas visibles.",
    pendingRows.length
      ? `Pendientes de cobro:\n${pendingRows.map((o) => line(o, "created")).join("\n")}`
      : "Pendientes de cobro: ninguna visible.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const SYSTEM = `
Eres Alux, el copiloto interno de Valladolid.mx (Oriente Maya de Yucatán).
Hablas con personal del equipo (concierge, editores, administración).

Tu tarea es acompañar a la persona en el panel que está viendo:
· Explicar qué significa cada bandeja, etapa, fase, folio, indicador o acción.
· Si el contexto trae una RESERVACIÓN CONSULTADA, responder sobre ese caso
  concreto: estado, forma de pago, importe, fechas y qué conviene hacer ahora.
· Si el contexto trae una FICHA EN EDICIÓN, explicar qué se escribe en el campo
  o sección por la que preguntan, con qué extensión y tono, y qué falta para
  poder publicar. Puedes sugerir un ejemplo de redacción SIEMPRE marcándolo
  como ejemplo a adaptar, nunca como dato verificado.

Reglas:
· Responde en español claro, breve y operativo (máximo 6 líneas o 6 viñetas).
· Usa EXCLUSIVAMENTE la información de contexto que recibes. Si algo no está
  ahí, dilo con honestidad y sugiere a quién preguntar. Nunca inventes datos,
  cifras, nombres de viajeros, precios, horarios ni funciones que no se
  mencionen.
· Quien te consulta es personal interno autorizado: SÍ puedes darle el nombre,
  teléfono, WhatsApp y correo que aparezcan en la RESERVACIÓN CONSULTADA, tal
  cual, para que pueda contactar al viajero. Si un dato no está registrado,
  dilo; nunca lo inventes ni lo completes.
· No prometas ejecutar acciones: tú explicas y consultas, la persona actúa en
  el panel.

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

    // Dato real, sólo lectura: folio escrito en la pregunta o reservación /
    // expediente abierto en la pantalla activa.
    const folioMatch = FOLIO_RE.exec(data.question);
    let reservationBlock: string | null = null;
    try {
      if (folioMatch?.[1]) {
        reservationBlock = await reservationContext(context.supabase, {
          folio: folioMatch[1].replace(/\s+/g, "-").toUpperCase(),
        });
      } else if (data.subject?.kind === "order" && data.subject.id) {
        reservationBlock = await reservationContext(context.supabase, { orderId: data.subject.id });
      } else if (data.subject?.kind === "case" && data.subject.id) {
        reservationBlock = await reservationContext(context.supabase, { caseId: data.subject.id });
      }
    } catch (err) {
      console.error(
        "[alux.workspace-assist] no se pudo leer la reservación",
        err instanceof Error ? err.message : err,
      );
    }

    // Sin folio ni caso abierto: panorama reciente para preguntas del tipo
    // "¿quién pagó al último?" o "¿cuáles faltan por cobrar?".
    let recentBlock: string | null = null;
    if (!reservationBlock && data.workspaceId === "concierge") {
      try {
        recentBlock = await recentReservationsContext(context.supabase);
      } catch (err) {
        console.error(
          "[alux.workspace-assist] no se pudo leer el panorama de reservaciones",
          err instanceof Error ? err.message : err,
        );
      }
    }


    const entityBlock =
      data.subject?.kind === "entity"
        ? [
            "FICHA EN EDICIÓN",
            data.subject.label ? `· Ficha: ${data.subject.label}.` : null,
            data.subject.status ? `· Estado de publicación: ${data.subject.status}.` : null,
            data.subject.fields?.length
              ? `· Campos del formulario: ${data.subject.fields.join(", ")}.`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        : null;

    const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
      import("ai"),
      import("@/lib/ai-gateway.server"),
    ]);

    const contextBlock = [
      `Panel activo: ${data.workspaceLabel} (${data.workspaceId}).`,
      data.route ? `Pantalla actual: ${data.route}.` : null,
      data.areas?.length ? `Secciones del panel: ${data.areas.join(", ")}.` : null,
      data.workspaceId === "concierge" ? CONCIERGE_GLOSSARY : null,
      data.workspaceId === "cms" || entityBlock ? CMS_GLOSSARY : null,
      entityBlock,
      reservationBlock,
      recentBlock,
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
