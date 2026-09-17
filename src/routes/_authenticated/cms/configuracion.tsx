/**
 * /_authenticated/cms/configuracion — Configuración de la plataforma.
 *
 * Sección central de ajustes operativos: formas de pago y pasarela,
 * reservas y apartados, avisos y notificaciones.
 *
 * Fuente de verdad única: `platform_settings` vía
 * `@/lib/settings/platform-config.functions`. Las llaves secretas de la
 * pasarela NO se administran aquí; sólo se reporta si están capturadas.
 *
 * Sólo super_admin / admin (validado en el servidor).
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  PLATFORM_SETTINGS,
  SETTING_GROUP_LABEL,
  getPlatformConfig,
  setPlatformConfigValue,
  type SettingDefinition,
} from "@/lib/settings/platform-config.functions";

export const Route = createFileRoute("/_authenticated/cms/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content:
          "Ajustes de formas de pago, pasarela, reservas y avisos de la plataforma Valladolid.mx.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformConfigPage,
});

const GROUP_ORDER: SettingDefinition["group"][] = ["pagos", "reservas", "avisos"];

function PlatformConfigPage() {
  const fetchConfig = useServerFn(getPlatformConfig);
  const saveValue = useServerFn(setPlatformConfigValue);
  const qc = useQueryClient();

  const configQ = useQuery({
    queryKey: ["cms", "configuracion"],
    queryFn: () => fetchConfig(),
    staleTime: 15_000,
  });

  const save = useMutation({
    mutationFn: (vars: { key: string; value: boolean | number | string }) =>
      saveValue({ data: vars }),
    onSuccess: () => {
      toast.success("Configuración guardada");
      void qc.invalidateQueries({ queryKey: ["cms", "configuracion"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "No se pudo guardar";
      toast.error(
        msg.includes("setting_locked")
          ? "Ese ajuste está bloqueado hasta que la pasarela quede autorizada."
          : msg,
      );
    },
  });

  const valueByKey = useMemo(() => {
    const map = new Map<string, boolean | number | string>();
    for (const v of configQ.data?.values ?? []) map.set(v.key, v.value);
    return map;
  }, [configQ.data]);

  const gateway = configQ.data?.gateway;

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Configuración
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Configuración de la plataforma</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Formas de pago, pasarela, reglas de reservación y avisos internos. Las credenciales de la
          pasarela se guardan como secretos y no se muestran aquí.
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pasarela de pago</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Proveedor configurado:{" "}
              <span className="font-medium capitalize">{gateway?.provider ?? "—"}</span>
            </p>
          </div>
          <Badge variant={gateway?.ready ? "default" : "outline"} className="text-[10px] uppercase">
            {gateway?.ready ? "Credenciales listas" : "Pendiente de credenciales"}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatusItem label="Llave secreta" ok={gateway?.hasSecretKey} />
          <StatusItem label="Firma del webhook" ok={gateway?.hasWebhookSecret} />
        </dl>
        <p className="mt-4 break-words text-xs text-muted-foreground">
          Dirección de avisos del proveedor: <code>{gateway?.webhookPath ?? "—"}</code>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Mientras falten credenciales, el cobro con tarjeta permanece instalado pero apagado. La
          modalidad vigente es el pago en efectivo, igual que en Arma tu Viaje.
        </p>
      </section>

      {GROUP_ORDER.map((group) => (
        <section key={group} className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {SETTING_GROUP_LABEL[group]}
          </h2>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {PLATFORM_SETTINGS.filter((d) => d.group === group).map((def) => (
              <SettingRow
                key={def.key}
                def={def}
                value={valueByKey.get(def.key) ?? def.defaultValue}
                loading={configQ.isLoading}
                saving={save.isPending}
                onSave={(value) => save.mutate({ key: def.key, value })}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatusItem({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <dt className="text-sm">{label}</dt>
      <dd>
        <Badge variant={ok ? "default" : "outline"} className="text-[10px] uppercase">
          {ok ? "Capturada" : "Falta"}
        </Badge>
      </dd>
    </div>
  );
}

function SettingRow({
  def,
  value,
  loading,
  saving,
  onSave,
}: {
  def: SettingDefinition;
  value: boolean | number | string;
  loading: boolean;
  saving: boolean;
  onSave: (value: boolean | number | string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const textValue = draft ?? String(value ?? "");
  const dirty = draft !== null && draft !== String(value ?? "");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-4">
      <div className="min-w-[14rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{def.label}</p>
          {def.locked ? (
            <Badge variant="outline" className="text-[10px] uppercase">
              Bloqueado
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{def.help}</p>
        {def.locked && def.lockedNote ? (
          <p className="mt-1 text-xs text-muted-foreground">{def.lockedNote}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {def.kind === "boolean" ? (
          <Switch
            checked={Boolean(value)}
            disabled={loading || saving || def.locked}
            onCheckedChange={(checked) => onSave(checked)}
            aria-label={def.label}
          />
        ) : (
          <>
            <Input
              type={def.kind === "number" ? "number" : "text"}
              value={textValue}
              min={def.min}
              max={def.max}
              disabled={loading || saving}
              onChange={(e) => setDraft(e.target.value)}
              className="w-56"
              aria-label={def.label}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => {
                onSave(def.kind === "number" ? Number(textValue) : textValue);
                setDraft(null);
              }}
            >
              Guardar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
