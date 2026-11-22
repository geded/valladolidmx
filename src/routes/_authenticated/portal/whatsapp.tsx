/**
 * /portal/whatsapp — WhatsApp de la empresa con Alux (Fase 5, propuesta 19.48).
 *
 * La empresa conecta su número por QR; Alux contesta ahí con la personalidad y
 * las reglas de la Consola de Alux y sólo con los datos de esta empresa. Aquí
 * se afina cómo se presenta, se agregan preguntas y respuestas propias y se
 * atienden las pláticas. Los contactos son de la empresa.
 */
import { useEffect, useState } from "react";
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { meridaDateTime } from "@/lib/time/merida";
import {
  createBusinessWhatsAppLine,
  deleteBusinessAluxFaq,
  disconnectBusinessWhatsAppLine,
  getBusinessWhatsApp,
  getBusinessWhatsAppChat,
  listBusinessAluxFaqs,
  listBusinessWhatsAppChats,
  previewBusinessAlux,
  refreshBusinessWhatsAppLine,
  saveBusinessAluxFaq,
  saveBusinessAluxPresentation,
  setBusinessWhatsAppAlux,
  updateBusinessWhatsAppContact,
  type BusinessChatRow,
  type BusinessFaqRow,
  type BusinessWhatsAppLine,
} from "@/lib/portal/business-whatsapp.functions";
import {
  BUSINESS_COMMANDS,
  BUSINESS_COMMAND_HELP,
  BUSINESS_CONTACT_STAGES,
  BUSINESS_CONTACT_STAGE_LABEL,
  type BusinessContactStage,
} from "@/lib/crm/whatsapp/business-rules";
import { WhatsAppConversationPanel } from "@/components/crm/WhatsAppConversationPanel";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";
const DESCRIPTION =
  "Conecta el WhatsApp de tu empresa para que Alux conteste con tu información y tus precios.";

export const Route = createFileRoute("/_authenticated/portal/whatsapp")({
  component: BusinessWhatsAppPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "WhatsApp con Alux | Portal Empresarial" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "WhatsApp con Alux | Portal Empresarial" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(window.localStorage.getItem(STORAGE_KEY));
    const onChange = (e: Event) => setId((e as CustomEvent<string>).detail ?? null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setId(e.newValue);
    };
    window.addEventListener("portal:active-business-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("portal:active-business-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return id;
}

type Tab = "conexion" | "presentacion" | "preguntas" | "platicas";
const TABS: { id: Tab; label: string }[] = [
  { id: "conexion", label: "Conexión" },
  { id: "presentacion", label: "Cómo se presenta" },
  { id: "preguntas", label: "Preguntas y respuestas" },
  { id: "platicas", label: "Pláticas" },
];

const btnPrimary =
  "inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60";
const btnSecondary =
  "inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60";
const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function BusinessWhatsAppPage() {
  const businessId = useActiveBusinessId();
  const [tab, setTab] = useState<Tab>("conexion");
  const getFn = useServerFn(getBusinessWhatsApp);
  const q = useQuery({
    queryKey: ["portal", businessId, "whatsapp", "summary"],
    enabled: !!businessId,
    queryFn: () => getFn({ data: { businessId: businessId! } }),
  });

  if (!businessId) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
        <h2 className="text-lg font-semibold">Selecciona una empresa</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige la empresa activa en el menú lateral para conectar su WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial
        </p>
        <h1 className="mt-1 text-3xl font-semibold">WhatsApp con Alux</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Alux contesta en el WhatsApp de {q.data?.businessName ?? "tu empresa"} con tu ficha, tus
          productos y tus propios precios. Usa las mismas reglas que el Alux de Valladolid.mx y
          nunca recomienda a otras empresas.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "min-h-10 rounded-t-md px-4 py-2 text-sm",
              tab === t.id
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.isError || !q.data ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No tienes acceso al WhatsApp de esta empresa.
        </p>
      ) : (
        <>
          {tab === "conexion" && <ConnectionPanel businessId={businessId} data={q.data} />}
          {tab === "presentacion" && <PresentationPanel businessId={businessId} data={q.data} />}
          {tab === "preguntas" && <FaqPanel businessId={businessId} canEdit={q.data.canEdit} />}
          {tab === "platicas" && <ChatsPanel businessId={businessId} canEdit={q.data.canEdit} />}
        </>
      )}
    </div>
  );
}

type Summary = Awaited<ReturnType<typeof getBusinessWhatsApp>>;

const STATUS_LABEL: Record<BusinessWhatsAppLine["status"], string> = {
  pending: "Pendiente",
  connecting: "Esperando el QR",
  connected: "Conectado",
  disconnected: "Desconectado",
};
const STATUS_TONE: Record<BusinessWhatsAppLine["status"], string> = {
  pending: "border-border bg-muted text-muted-foreground",
  connecting: "border-warning/30 bg-warning/10 text-warning",
  connected: "border-success/30 bg-success/10 text-success",
  disconnected: "border-destructive/30 bg-destructive/10 text-destructive",
};

/* ─────────────────────────── Conexión ─────────────────────────── */

function ConnectionPanel({ businessId, data }: { businessId: string; data: Summary }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createBusinessWhatsAppLine);
  const refreshFn = useServerFn(refreshBusinessWhatsAppLine);
  const disconnectFn = useServerFn(disconnectBusinessWhatsAppLine);
  const aluxFn = useServerFn(setBusinessWhatsAppAlux);
  const line = data.line;
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<BusinessWhatsAppLine["status"] | null>(line?.status ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setStatus(line?.status ?? null), [line?.status]);
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["portal", businessId, "whatsapp", "summary"] });

  useEffect(() => {
    if (!data.canManage || status === "connected" || !qr) return;
    let tick = 0;
    const t = window.setInterval(async () => {
      tick += 1;
      try {
        const r = await refreshFn({ data: { businessId, newQr: tick % 6 === 0 } });
        if (r.ok) {
          if (r.status === "connected") {
            setQr(null);
            setStatus("connected");
            toast.success("WhatsApp conectado. Alux ya atiende tu número.");
            invalidate();
          } else if (r.qr) setQr(r.qr);
        }
      } catch {
        /* siguiente intento */
      }
    }, 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.canManage, status, qr, businessId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      toast.error("No se pudo completar la operación.");
    } finally {
      setBusy(false);
      invalidate();
    }
  };

  const k = data.knows;
  return (
    <div className="space-y-5">
      {!data.whatsappChannelOn ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Valladolid.mx tiene a Alux en pausa en WhatsApp por ahora. Los mensajes se guardan y tu
          equipo puede contestarlos aquí.
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Tu número de WhatsApp</h2>
            <p className="text-xs text-muted-foreground">
              {line?.phone_e164 ?? "Sin número todavía"}
              {line?.profile_name ? ` · ${line.profile_name}` : ""}
              {line?.last_state_at ? ` · ${meridaDateTime(line.last_state_at)}` : ""}
            </p>
          </div>
          {status ? (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          ) : null}
        </div>

        {line ? (
          <p className="text-sm">
            {line.alux_enabled
              ? "Alux contesta en tu WhatsApp."
              : "Alux está en pausa: solo tu equipo contesta."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ten a la mano el teléfono con el WhatsApp de tu empresa. Al conectar aparece un código
            QR: en el teléfono abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo y
            escanéalo. Tu teléfono sigue funcionando normal.
          </p>
        )}

        {qr && status !== "connected" ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4">
            <img src={qr} alt="Código QR para vincular WhatsApp" className="h-56 w-56" />
            {code ? <p className="font-mono text-sm">Código: {code}</p> : null}
            <p className="text-center text-xs text-muted-foreground">
              El QR cambia cada poco; esta pantalla lo actualiza sola.
            </p>
          </div>
        ) : null}

        {data.canManage ? (
          <div className="flex flex-wrap gap-2">
            {!line ? (
              <button
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() =>
                  void run(async () => {
                    const r = await createFn({ data: { businessId } });
                    if (!r.ok) toast.error(r.error);
                    else {
                      setQr(r.qr);
                      setCode(r.pairingCode);
                      setStatus("connecting");
                      toast.success("Escanea el QR con el teléfono de tu empresa.");
                    }
                  })
                }
              >
                {busy ? "Preparando…" : "Conectar mi WhatsApp"}
              </button>
            ) : null}
            {line && status !== "connected" ? (
              <button
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() =>
                  void run(async () => {
                    const r = await refreshFn({ data: { businessId, newQr: true } });
                    if (!r.ok) toast.error(r.error);
                    else if (r.status === "connected") {
                      setStatus("connected");
                      setQr(null);
                    } else {
                      setQr(r.qr);
                      setCode(r.pairingCode);
                    }
                  })
                }
              >
                Mostrar QR
              </button>
            ) : null}
            {line ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className={btnSecondary}
                  onClick={() =>
                    void run(async () => {
                      const r = await refreshFn({ data: { businessId, newQr: false } });
                      if (r.ok) setStatus(r.status as BusinessWhatsAppLine["status"]);
                      else toast.error(r.error);
                    })
                  }
                >
                  Revisar estado
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={btnSecondary}
                  onClick={() =>
                    void run(async () => {
                      await aluxFn({ data: { businessId, enabled: !line.alux_enabled } });
                    })
                  }
                >
                  {line.alux_enabled ? "Pausar a Alux" : "Activar a Alux"}
                </button>
              </>
            ) : null}
            {line && status === "connected" ? (
              <button
                type="button"
                disabled={busy}
                className="inline-flex min-h-9 items-center rounded-full border border-destructive/40 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                onClick={() => {
                  if (!window.confirm("¿Desvincular tu WhatsApp? Alux dejará de contestar ahí."))
                    return;
                  void run(async () => {
                    const r = await disconnectFn({ data: { businessId } });
                    if (r.ok) setStatus("disconnected");
                    else toast.error(r.error);
                  });
                }}
              >
                Desvincular
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Solo el propietario o un gerente de la empresa puede conectar el número.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Lo que Alux sabe de tu empresa</h2>
        <p className="text-sm text-muted-foreground">
          Alux toma tu información de lo que ya diste de alta. Mientras más completa, mejor
          contesta.
        </p>
        <ul className="space-y-1 text-sm">
          <KnowItem ok={k.description} label="Descripción de tu ficha" to="/portal/ficha" />
          <KnowItem
            ok={k.products > 0}
            label={`Productos publicados: ${k.products} (${k.productsWithPrice} con precio)`}
            to="/portal/catalogo"
          />
          <KnowItem ok={k.hours} label="Horario" to="/portal/presencia" />
          <KnowItem ok={k.location} label="Ubicación" to="/portal/presencia" />
          <KnowItem ok={k.faqs > 0} label={`Preguntas y respuestas: ${k.faqs}`} to={null} />
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Comandos desde tu teléfono</h2>
        <p className="text-sm text-muted-foreground">
          Escríbelos en la plática con el cliente; se guardan y se borran del chat. Si contestas tú
          desde el teléfono, Alux se calla en esa plática.
        </p>
        <ul className="space-y-1 text-sm">
          {BUSINESS_COMMANDS.map((c) => (
            <li key={c}>
              <span className="font-mono font-semibold">#{c}</span> — {BUSINESS_COMMAND_HELP[c]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function KnowItem({ ok, label, to }: { ok: boolean; label: string; to: string | null }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-warning"}`}
      />
      <span>{label}</span>
      {!ok && to ? (
        <Link to={to} className="text-xs font-medium text-primary hover:underline">
          Completar
        </Link>
      ) : null}
    </li>
  );
}

/* ─────────────────────────── Cómo se presenta ─────────────────────────── */

function PresentationPanel({ businessId, data }: { businessId: string; data: Summary }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveBusinessAluxPresentation);
  const previewFn = useServerFn(previewBusinessAlux);
  const line = data.line;
  const [greeting, setGreeting] = useState(line?.alux_greeting ?? "");
  const [tone, setTone] = useState<"cercano" | "formal">(line?.alux_tone ?? "cercano");
  const [highlights, setHighlights] = useState(line?.alux_highlights ?? "");
  const [question, setQuestion] = useState("Hola, ¿qué ofrecen y cuánto cuesta?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const disabled = !data.canEdit || !line;

  const save = async () => {
    setBusy(true);
    try {
      const r = await saveFn({ data: { businessId, greeting, tone, highlights } });
      if (r.ok) {
        toast.success("Guardado. Alux lo usa desde el siguiente mensaje.");
        void qc.invalidateQueries({ queryKey: ["portal", businessId, "whatsapp", "summary"] });
      } else toast.error(r.error);
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setAnswer(null);
    try {
      const r = await previewFn({ data: { businessId, question, greeting, tone, highlights } });
      if (r.ok) setAnswer(r.text);
      else toast.error(r.error);
    } catch {
      toast.error("No se pudo probar a Alux.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Cómo se presenta Alux</h2>
        <p className="text-sm text-muted-foreground">
          Siempre se llama Alux y sigue las reglas de Valladolid.mx. Lo que dejes vacío se arma solo
          con tu ficha: «{data.defaultPresentation}»
        </p>
        {!line ? (
          <p className="text-sm text-warning">Primero conecta el WhatsApp de tu empresa.</p>
        ) : null}
        <label className="block text-sm font-medium" htmlFor="biz-greeting">
          Saludo de tu empresa (opcional)
        </label>
        <textarea
          id="biz-greeting"
          rows={2}
          maxLength={400}
          value={greeting}
          disabled={disabled}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder={`Ej.: Bienvenido a ${data.businessName}, gracias por escribirnos.`}
          className={input}
        />
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Tono</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["cercano", "formal"] as const).map((t) => (
              <label key={t} className="flex min-h-9 items-center gap-2">
                <input
                  type="radio"
                  name="biz-tone"
                  checked={tone === t}
                  disabled={disabled}
                  onChange={() => setTone(t)}
                />
                {t === "cercano" ? "Cercano (de tú)" : "Formal (de usted)"}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-medium" htmlFor="biz-highlights">
          Lo que Alux debe destacar (opcional)
        </label>
        <textarea
          id="biz-highlights"
          rows={2}
          maxLength={600}
          value={highlights}
          disabled={disabled}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="Ej.: Somos pet friendly. El desayuno está incluido."
          className={input}
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void save()}
          className={btnPrimary}
        >
          Guardar
        </button>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Prueba a Alux</h2>
        <p className="text-sm text-muted-foreground">
          Escribe una pregunta como si fueras un cliente. No se manda nada por WhatsApp.
        </p>
        <label className="sr-only" htmlFor="biz-test-q">
          Pregunta de prueba
        </label>
        <input
          id="biz-test-q"
          value={question}
          maxLength={600}
          onChange={(e) => setQuestion(e.target.value)}
          className={input}
        />
        <button
          type="button"
          disabled={!data.canEdit || busy || question.trim().length < 2}
          onClick={() => void test()}
          className={btnSecondary}
        >
          {busy ? "Alux está escribiendo…" : "Probar"}
        </button>
        {answer ? (
          <div className="rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap">
            {answer}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/* ─────────────────────────── Preguntas y respuestas ─────────────────────────── */

function FaqPanel({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBusinessAluxFaqs);
  const saveFn = useServerFn(saveBusinessAluxFaq);
  const key = ["portal", businessId, "whatsapp", "faqs"];
  const q = useQuery({ queryKey: key, queryFn: () => listFn({ data: { businessId } }) });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["portal", businessId, "whatsapp", "summary"] });
  };
  const rows = q.data ?? [];
  const pending = rows.filter((r) => r.status !== "published" && !r.answer.trim());
  const answered = rows.filter((r) => !(r.status !== "published" && !r.answer.trim()));

  const add = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { businessId, question, answer } });
      setQuestion("");
      setAnswer("");
      toast.success("Alux ya puede usar esta respuesta.");
      refresh();
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {pending.length ? (
        <section className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <h2 className="text-base font-semibold">Preguntas que Alux no supo contestar</h2>
          <p className="text-sm text-muted-foreground">
            Escribe la respuesta y Alux la usará desde el siguiente mensaje.
          </p>
          <ul className="space-y-3">
            {pending.map((f) => (
              <FaqRow
                key={f.id}
                faq={f}
                businessId={businessId}
                canEdit={canEdit}
                onDone={refresh}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {canEdit ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Agregar una pregunta</h2>
          <p className="text-sm text-muted-foreground">
            Para lo que no cabe en tu ficha: mascotas, estacionamiento, factura, formas de pago…
          </p>
          <label className="block text-sm font-medium" htmlFor="faq-q">
            Pregunta
          </label>
          <input
            id="faq-q"
            value={question}
            maxLength={300}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="¿Aceptan mascotas?"
            className={input}
          />
          <label className="block text-sm font-medium" htmlFor="faq-a">
            Respuesta
          </label>
          <textarea
            id="faq-a"
            rows={3}
            value={answer}
            maxLength={1500}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Sí, aceptamos mascotas pequeñas sin costo extra."
            className={input}
          />
          <button
            type="button"
            disabled={busy || question.trim().length < 3 || !answer.trim()}
            onClick={() => void add()}
            className={btnPrimary}
          >
            Guardar pregunta
          </button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tus preguntas y respuestas ({answered.length})</h2>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : answered.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Todavía no hay preguntas. Alux contesta con tu ficha mientras tanto.
          </p>
        ) : (
          <ul className="space-y-3">
            {answered.map((f) => (
              <FaqRow
                key={f.id}
                faq={f}
                businessId={businessId}
                canEdit={canEdit}
                onDone={refresh}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FaqRow({
  faq,
  businessId,
  canEdit,
  onDone,
}: {
  faq: BusinessFaqRow;
  businessId: string;
  canEdit: boolean;
  onDone: () => void;
}) {
  const saveFn = useServerFn(saveBusinessAluxFaq);
  const deleteFn = useServerFn(deleteBusinessAluxFaq);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [busy, setBusy] = useState(false);
  const dirty = question !== faq.question || answer !== faq.answer;

  const save = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { businessId, id: faq.id, question, answer } });
      toast.success("Guardado.");
      onDone();
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="space-y-2 rounded-lg border border-border bg-card p-3">
      <input
        aria-label="Pregunta"
        value={question}
        disabled={!canEdit}
        maxLength={300}
        onChange={(e) => setQuestion(e.target.value)}
        className={`${input} font-medium`}
      />
      <textarea
        aria-label="Respuesta"
        rows={2}
        value={answer}
        disabled={!canEdit}
        maxLength={1500}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Escribe la respuesta…"
        className={input}
      />
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              busy ||
              !answer.trim() ||
              question.trim().length < 3 ||
              (!dirty && faq.status === "published")
            }
            onClick={() => void save()}
            className={btnSecondary}
          >
            {faq.status === "published" ? "Guardar cambios" : "Guardar respuesta"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("¿Borrar esta pregunta?")) return;
              void (async () => {
                setBusy(true);
                try {
                  await deleteFn({ data: { businessId, id: faq.id } });
                  onDone();
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className="inline-flex min-h-9 items-center rounded-full border border-destructive/40 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            Borrar
          </button>
        </div>
      ) : null}
    </li>
  );
}

/* ─────────────────────────── Pláticas ─────────────────────────── */

function ChatsPanel({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  const listFn = useServerFn(listBusinessWhatsAppChats);
  const q = useQuery({
    queryKey: ["portal", businessId, "whatsapp", "chats"],
    queryFn: () => listFn({ data: { businessId } }),
    refetchInterval: 20_000,
  });
  const [open, setOpen] = useState<string | null>(null);
  const rows = q.data ?? [];
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando pláticas…</p>;
  if (!rows.length)
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Todavía no hay pláticas. Cuando alguien escriba a tu WhatsApp aparecerá aquí.
      </p>
    );
  return (
    <ul className="space-y-3">
      {rows.map((c) => (
        <ChatRow
          key={c.id}
          chat={c}
          businessId={businessId}
          canEdit={canEdit}
          open={open === c.id}
          onToggle={() => setOpen(open === c.id ? null : c.id)}
        />
      ))}
    </ul>
  );
}

function ChatRow({
  chat,
  businessId,
  canEdit,
  open,
  onToggle,
}: {
  chat: BusinessChatRow;
  businessId: string;
  canEdit: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getBusinessWhatsAppChat);
  const contactFn = useServerFn(updateBusinessWhatsAppContact);
  const msgs = useQuery({
    queryKey: ["portal", businessId, "whatsapp", "chat", chat.id],
    enabled: open,
    queryFn: () => getFn({ data: { businessId, sessionId: chat.id } }),
    refetchInterval: open ? 10_000 : false,
  });
  const contact = chat.contact;
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const name = contact?.first_name ?? "Contacto de WhatsApp";

  const setStage = async (stage: BusinessContactStage) => {
    if (!contact) return;
    try {
      await contactFn({ data: { businessId, contactId: contact.id, stage } });
      void qc.invalidateQueries({ queryKey: ["portal", businessId, "whatsapp", "chats"] });
    } catch {
      toast.error("No se pudo cambiar la etapa.");
    }
  };

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            {contact?.phone_e164 ?? ""} · {meridaDateTime(chat.last_seen_at)} · {chat.message_count}{" "}
            mensajes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {chat.handoff_requested_at && chat.alux_mode === "human" ? (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              Pidió una persona
            </span>
          ) : null}
          {contact ? (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium">
              {BUSINESS_CONTACT_STAGE_LABEL[contact.stage as BusinessContactStage] ?? contact.stage}
            </span>
          ) : null}
        </div>
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <ol className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
            {(msgs.data ?? []).map((m) => (
              <li
                key={m.id}
                className={
                  m.author === "system"
                    ? "text-center text-xs text-muted-foreground"
                    : m.role === "user"
                      ? "mr-8 rounded-lg bg-muted px-3 py-2 text-sm"
                      : "ml-8 rounded-lg bg-primary/10 px-3 py-2 text-sm"
                }
              >
                {m.author !== "system" ? (
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {m.role === "user" ? name : m.author === "alux" ? "Alux" : "Tu equipo"} ·{" "}
                    {meridaDateTime(m.created_at)}
                    {m.send_status === "failed" ? " · no se envió" : ""}
                  </span>
                ) : null}
                <span className="whitespace-pre-wrap">{m.content}</span>
              </li>
            ))}
          </ol>

          {canEdit ? (
            <WhatsAppConversationPanel
              sessionId={chat.id}
              mode={chat.alux_mode}
              language={chat.conversation_language}
              handoffRequestedAt={chat.handoff_requested_at}
              businessId={businessId}
            />
          ) : null}

          {contact && canEdit ? (
            <div className="space-y-2 rounded-lg border border-border bg-background p-3">
              <label className="block text-xs font-medium" htmlFor={`stage-${chat.id}`}>
                Etapa
              </label>
              <select
                id={`stage-${chat.id}`}
                value={contact.stage}
                onChange={(e) => void setStage(e.target.value as BusinessContactStage)}
                className={input}
              >
                {BUSINESS_CONTACT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {BUSINESS_CONTACT_STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
              <label className="block text-xs font-medium" htmlFor={`notes-${chat.id}`}>
                Notas de tu equipo
              </label>
              <textarea
                id={`notes-${chat.id}`}
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={input}
              />
              <button
                type="button"
                disabled={notes === (contact.notes ?? "")}
                onClick={() =>
                  void contactFn({ data: { businessId, contactId: contact.id, notes } })
                    .then(() => {
                      toast.success("Nota guardada.");
                      void qc.invalidateQueries({
                        queryKey: ["portal", businessId, "whatsapp", "chats"],
                      });
                    })
                    .catch(() => toast.error("No se pudo guardar la nota."))
                }
                className={btnSecondary}
              >
                Guardar nota
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
