/**
 * /concierge/prospectos/whatsapp — Líneas de WhatsApp del CRM Prospectos
 * (Fase 2, propuesta 19.48).
 *
 * Un administrador crea la línea, escanea el QR con el teléfono y ve si está
 * conectada; también la desvincula o pausa a Alux. El equipo concierge ve el
 * estado y la guía de comandos `#`.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { meridaDateTime } from "@/lib/time/merida";
import {
  createWhatsAppLine,
  disconnectWhatsAppLine,
  listWhatsAppLines,
  refreshWhatsAppLine,
  repointWhatsAppLine,
  setWhatsAppLineAlux,
  type WhatsAppLineRow,
} from "@/lib/crm/whatsapp.functions";
import { CONCIERGE_COMMANDS, CONCIERGE_COMMAND_HELP } from "@/lib/crm/whatsapp/rules";

export const Route = createFileRoute("/_authenticated/concierge/prospectos/whatsapp")({
  component: WhatsAppLinesPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "Líneas de WhatsApp | CRM Prospectos" },
      {
        name: "description",
        content: "Conecta por QR el WhatsApp donde Alux y el concierge atienden a los prospectos.",
      },
      { property: "og:title", content: "Líneas de WhatsApp | CRM Prospectos" },
      {
        property: "og:description",
        content: "Conecta por QR el WhatsApp donde Alux y el concierge atienden a los prospectos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const STATUS_LABEL: Record<WhatsAppLineRow["status"], string> = {
  pending: "Pendiente",
  connecting: "Conectando",
  connected: "Conectada",
  disconnected: "Desconectada",
};
const STATUS_TONE: Record<WhatsAppLineRow["status"], string> = {
  pending: "border-border bg-muted text-muted-foreground",
  connecting: "border-warning/30 bg-warning/10 text-warning",
  connected: "border-success/30 bg-success/10 text-success",
  disconnected: "border-destructive/30 bg-destructive/10 text-destructive",
};

function WhatsAppLinesPage() {
  const listFn = useServerFn(listWhatsAppLines);
  const createFn = useServerFn(createWhatsAppLine);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["crm-wa-lines"], queryFn: () => listFn() });
  const [label, setLabel] = useState("Concierge Valladolid.mx");
  const [busy, setBusy] = useState(false);
  const [qrFor, setQrFor] = useState<Record<string, { qr: string | null; code: string | null }>>(
    {},
  );

  const create = async () => {
    setBusy(true);
    try {
      const r = await createFn({ data: { label } });
      if (r.ok) {
        setQrFor((m) => ({ ...m, [r.lineId]: { qr: r.qr, code: r.pairingCode } }));
        toast.success("Línea creada. Escanea el QR con el teléfono.");
        void qc.invalidateQueries({ queryKey: ["crm-wa-lines"] });
      } else toast.error(r.error);
    } catch {
      toast.error("No se pudo crear la línea.");
    } finally {
      setBusy(false);
    }
  };

  const lines = q.data?.lines ?? [];
  const canManage = q.data?.canManage ?? false;
  return (
    <div className="space-y-5 pb-12">
      <header>
        <Link
          to="/concierge/prospectos"
          className="inline-flex min-h-9 items-center text-sm font-medium text-primary hover:underline"
        >
          ← CRM Prospectos
        </Link>
        <h1 className="mt-1 font-serif text-3xl">Líneas de WhatsApp</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El número donde Alux contesta y el concierge sigue la plática. Lo que el concierge escribe
          desde ese teléfono cuenta como respuesta humana y Alux se calla.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando líneas…</p>
      ) : lines.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Todavía no hay una línea conectada.
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((l) => (
            <LineCard key={l.id} line={l} canManage={canManage} initialQr={qrFor[l.id] ?? null} />
          ))}
        </ul>
      )}

      {canManage ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Conectar un número</h2>
          <p className="text-sm text-muted-foreground">
            Ten a la mano el teléfono con WhatsApp Business. Al crear la línea aparece un QR: en el
            teléfono abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo y escanéalo.
          </p>
          <label className="block text-sm font-medium" htmlFor="wa-line-label">
            Nombre de la línea
          </label>
          <input
            id="wa-line-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || label.trim().length < 2}
            onClick={() => void create()}
            className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Creando…" : "Crear línea y mostrar QR"}
          </button>
        </section>
      ) : null}

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Comandos desde el teléfono</h2>
        <p className="text-sm text-muted-foreground">
          Escríbelos en la plática con el cliente; se registran en su ficha y se borran del chat.
        </p>
        <ul className="space-y-1 text-sm">
          {CONCIERGE_COMMANDS.map((c) => (
            <li key={c}>
              <span className="font-mono font-semibold">#{c}</span> — {CONCIERGE_COMMAND_HELP[c]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LineCard({
  line,
  canManage,
  initialQr,
}: {
  line: WhatsAppLineRow;
  canManage: boolean;
  initialQr: { qr: string | null; code: string | null } | null;
}) {
  const qc = useQueryClient();
  const refreshFn = useServerFn(refreshWhatsAppLine);
  const disconnectFn = useServerFn(disconnectWhatsAppLine);
  const aluxFn = useServerFn(setWhatsAppLineAlux);
  const repointFn = useServerFn(repointWhatsAppLine);
  const [qr, setQr] = useState<string | null>(initialQr?.qr ?? null);
  const [code, setCode] = useState<string | null>(initialQr?.code ?? null);
  const [status, setStatus] = useState(line.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => setStatus(line.status), [line.status]);
  useEffect(() => {
    if (initialQr?.qr) setQr(initialQr.qr);
  }, [initialQr?.qr]);

  // Mientras se conecta, revisa cada 5 s si ya se escaneó el QR.
  useEffect(() => {
    if (!canManage || status === "connected" || !qr) return;
    let tick = 0;
    const t = window.setInterval(async () => {
      tick += 1;
      try {
        // Cada 30 s pide un QR nuevo por si el anterior ya venció.
        const r = await refreshFn({ data: { id: line.id, newQr: tick % 6 === 0 } });
        if (r.ok) {
          if (r.status === "connected") {
            setQr(null);
            setStatus("connected");
            toast.success("WhatsApp conectado");
            void qc.invalidateQueries({ queryKey: ["crm-wa-lines"] });
          } else if (r.qr) setQr(r.qr);
        }
      } catch {
        /* siguiente intento */
      }
    }, 5000);
    return () => window.clearInterval(t);
  }, [canManage, status, qr, line.id, refreshFn, qc]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["crm-wa-lines"] });
    }
  };

  return (
    <li className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{line.label}</p>
          <p className="text-xs text-muted-foreground">
            {line.phone_e164 ?? "Sin número todavía"}
            {line.profile_name ? ` · ${line.profile_name}` : ""}
            {line.last_state_at ? ` · ${meridaDateTime(line.last_state_at)}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-sm">
        {line.alux_enabled ? "Alux contesta en esta línea." : "Alux está en pausa en esta línea."}
      </p>

      {qr && status !== "connected" ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4">
          <img src={qr} alt="Código QR para vincular WhatsApp" className="h-56 w-56" />
          {code ? <p className="font-mono text-sm">Código: {code}</p> : null}
          <p className="text-center text-xs text-muted-foreground">
            WhatsApp → Dispositivos vinculados → Vincular un dispositivo. El QR cambia cada poco;
            esta pantalla lo actualiza sola.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {status !== "connected" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await refreshFn({ data: { id: line.id, newQr: true } });
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
              className="inline-flex min-h-9 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              Mostrar QR
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await refreshFn({ data: { id: line.id, newQr: false } });
                if (r.ok) setStatus(r.status as WhatsAppLineRow["status"]);
                else toast.error(r.error);
              })
            }
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            Revisar estado
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await aluxFn({ data: { id: line.id, enabled: !line.alux_enabled } });
              })
            }
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {line.alux_enabled ? "Pausar a Alux" : "Activar a Alux"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await repointFn({ data: { id: line.id } });
                if (r.ok) toast.success("Los avisos llegan a este sitio");
                else toast.error(r.error);
              })
            }
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            Recibir avisos aquí
          </button>
          {status === "connected" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm("¿Desvincular este WhatsApp? Alux dejará de contestar ahí."))
                  return;
                void run(async () => {
                  const r = await disconnectFn({ data: { id: line.id } });
                  if (r.ok) setStatus("disconnected");
                  else toast.error(r.error);
                });
              }}
              className="inline-flex min-h-9 items-center rounded-full border border-destructive/40 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              Desvincular
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
