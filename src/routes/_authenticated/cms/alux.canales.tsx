/**
 * CRM · Fase 4 — Canales de Alux (solo administradores).
 * Encender o apagar Alux en Valladolid.mx, WhatsApp y otras páginas;
 * Instagram y Messenger se muestran como «sin conectar».
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy } from "lucide-react";
import {
  getAluxChannelsAdmin,
  setAluxChannel,
  setAluxEmbedHosts,
} from "@/lib/alux/channels.functions";
import { embedSnippet, type AluxChannelKey } from "@/lib/alux/channels";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/alux/canales")({
  head: () => ({
    meta: [
      { title: "Canales de Alux · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxChannelsPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Sin vincular",
  connected: "Conectada",
  open: "Conectada",
  connecting: "Esperando el código QR",
  qr: "Esperando el código QR",
  disconnected: "Desconectada",
  close: "Desconectada",
};

function AluxChannelsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAluxChannelsAdmin);
  const setFn = useServerFn(setAluxChannel);
  const hostsFn = useServerFn(setAluxEmbedHosts);
  const q = useQuery({ queryKey: ["cms", "alux-channels"], queryFn: () => getFn() });
  const [hosts, setHosts] = useState<string | null>(null);
  useEffect(() => {
    if (q.data && hosts === null) setHosts(q.data.embedHosts.join("\n"));
  }, [q.data, hosts]);

  const toggle = useMutation({
    mutationFn: (v: { key: AluxChannelKey; enabled: boolean }) => setFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.enabled ? "Alux encendido en este canal" : "Alux apagado en este canal");
      void qc.invalidateQueries({ queryKey: ["cms", "alux-channels"] });
    },
    onError: () => toast.error("No se pudo cambiar. Intenta de nuevo."),
  });
  const saveHosts = useMutation({
    mutationFn: () => hostsFn({ data: { hosts: (hosts ?? "").split(/[\s,]+/).filter(Boolean) } }),
    onSuccess: (r) => {
      setHosts(r.hosts.join("\n"));
      toast.success("Sitios guardados");
      void qc.invalidateQueries({ queryKey: ["cms", "alux-channels"] });
    },
    onError: () => toast.error("No se pudieron guardar los sitios."),
  });

  const snippet = embedSnippet(SITE.url.replace(/\/$/, ""), null);
  const d = q.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <Link
          to="/cms/alux"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Consola de Alux
        </Link>
        <h1 className="font-serif text-2xl">Dónde atiende Alux</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Enciende o apaga a Alux en cada lugar. El cambio se aplica al momento. Cuando lo apagas,
          los mensajes que lleguen se siguen guardando para que el equipo los atienda.
        </p>
      </header>

      {q.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar. Solo los administradores pueden ver esta pantalla.
        </p>
      ) : !d ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <ChannelCard
            title="Alux en Valladolid.mx"
            description="La ventana de Alux en todas las páginas del sitio y la página de Alux."
            checked={d.channels.web}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ key: "web", enabled: v })}
          />

          <ChannelCard
            title="Alux en WhatsApp"
            description="Alux contesta en las líneas de WhatsApp de Valladolid.mx que tengan a Alux activo."
            checked={d.channels.whatsapp}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ key: "whatsapp", enabled: v })}
          >
            {d.lines.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todavía no hay líneas de WhatsApp.</p>
            ) : (
              <ul className="space-y-1.5">
                {d.lines.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{l.label}</span>
                    <span className="flex gap-1.5">
                      <Badge variant="outline">{STATUS_LABEL[l.status] ?? l.status}</Badge>
                      <Badge variant={l.aluxEnabled ? "secondary" : "outline"}>
                        {l.aluxEnabled ? "Alux activo en la línea" : "Alux apagado en la línea"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/concierge/prospectos/whatsapp"
              className="inline-block text-xs underline underline-offset-4 hover:text-primary"
            >
              Ver líneas y código QR
            </Link>
          </ChannelCard>

          <ChannelCard
            title="Alux en otras páginas"
            description="La ventana de Alux dentro de la página de un hotel, restaurante o aliado."
            checked={d.channels.embed}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ key: "embed", enabled: v })}
          >
            <div className="space-y-2">
              <p className="text-xs font-medium">
                1. Sitios que pueden mostrar a Alux (uno por renglón)
              </p>
              <Textarea
                rows={3}
                value={hosts ?? ""}
                onChange={(e) => setHosts(e.target.value)}
                placeholder={"Ejemplo:\nhotelmeson.com"}
                aria-label="Sitios permitidos"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveHosts.mutate()}
                disabled={saveHosts.isPending}
              >
                Guardar sitios
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">
                2. Copia este código y pégalo en esa página, justo antes de donde termina
              </p>
              <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                <code>{snippet}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(snippet)
                    .then(() => toast.success("Código copiado"))
                    .catch(() => toast.error("No se pudo copiar"));
                }}
              >
                <Copy className="mr-1.5 size-3.5" aria-hidden /> Copiar código
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Aparece un botón de Alux en la esquina. Si el sitio no está en la lista o apagas
                este canal, el botón no aparece.
              </p>
            </div>
          </ChannelCard>

          {(["Instagram", "Messenger"] as const).map((name) => (
            <section
              key={name}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 opacity-80 shadow-soft"
            >
              <div>
                <h2 className="font-serif text-lg">Alux en {name}</h2>
                <p className="text-xs text-muted-foreground">Todavía no está conectado.</p>
              </div>
              <Badge variant="outline">Sin conectar</Badge>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function ChannelCard(props: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  const id = `ch-${props.title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft" aria-labelledby={id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-serif text-lg">
            {props.title}
          </h2>
          <p className="text-xs text-muted-foreground">{props.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{props.checked ? "Encendido" : "Apagado"}</span>
          <Switch
            checked={props.checked}
            disabled={props.disabled}
            onCheckedChange={props.onChange}
            aria-labelledby={id}
          />
        </div>
      </div>
      {props.children}
    </section>
  );
}
