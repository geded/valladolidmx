import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import {
  listVisibilityGrantsAdmin,
  activateVisibilityGrant,
  rejectVisibilityGrant,
  cancelVisibilityGrant,
  type AdminGrantRow,
} from "@/lib/visibility/admin-grants.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute(
  "/_authenticated/cms/visibilidad/solicitudes",
)({
  head: () => ({
    meta: [
      { title: "Solicitudes de visibilidad · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SolicitudesPage,
});

const STATUS_META: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendiente", tone: "default" },
  active: { label: "Activa", tone: "secondary" },
  rejected: { label: "Rechazada", tone: "destructive" },
  cancelled: { label: "Cancelada", tone: "outline" },
  superseded: { label: "Reemplazada", tone: "outline" },
  expired: { label: "Expirada", tone: "outline" },
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function SolicitudesPage() {
  const [tab, setTab] = useState<string>("pending");
  const listFn = useServerFn(listVisibilityGrantsAdmin);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cms", "visibility-grants", tab],
    queryFn: () => listFn({ data: { status: tab === "all" ? undefined : tab } }),
  });

  const grouped = useMemo(() => rows, [rows]);
  const [selected, setSelected] = useState<AdminGrantRow | null>(null);
  const [action, setAction] = useState<"activate" | "reject" | "cancel" | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Solicitudes de visibilidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprueba, activa o rechaza las contrataciones manuales de paquetes.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : grouped.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No hay solicitudes en este estado.
              </CardContent>
            </Card>
          ) : (
            grouped.map((g) => (
              <GrantCard
                key={g.id}
                grant={g}
                onActivate={() => {
                  setSelected(g);
                  setAction("activate");
                }}
                onReject={() => {
                  setSelected(g);
                  setAction("reject");
                }}
                onCancel={() => {
                  setSelected(g);
                  setAction("cancel");
                }}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ActivateDialog
        grant={action === "activate" ? selected : null}
        onClose={() => setAction(null)}
      />
      <ReasonDialog
        mode={action === "reject" || action === "cancel" ? action : null}
        grant={selected}
        onClose={() => setAction(null)}
      />
    </div>
  );
}

function GrantCard({
  grant,
  onActivate,
  onReject,
  onCancel,
}: {
  grant: AdminGrantRow;
  onActivate: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const meta = STATUS_META[grant.status] ?? { label: grant.status, tone: "outline" as const };
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {grant.business?.name ?? "Empresa sin nombre"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Solicitado {fmtDate(grant.created_at)} · {CYCLE_LABEL[grant.cycle] ?? grant.cycle}
            </p>
          </div>
          <Badge variant={meta.tone}>{meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <Field label="Plan" value={grant.plan?.name ?? "—"} />
          <Field label="Precio base" value={fmtMoney(grant.plan?.base_price_mxn ?? null)} />
          <Field label="Cobrado" value={fmtMoney(grant.amount_paid_mxn)} />
          <Field label="Vence" value={fmtDate(grant.expires_at)} />
        </div>
        {grant.notes ? (
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="mb-1 font-medium text-muted-foreground">Notas</p>
            <p className="whitespace-pre-wrap">{grant.notes}</p>
          </div>
        ) : null}
        {grant.cancelled_reason ? (
          <div className="rounded-md bg-destructive/5 p-3 text-xs">
            <p className="mb-1 font-medium text-destructive">Motivo</p>
            <p className="whitespace-pre-wrap">{grant.cancelled_reason}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {grant.status === "pending" ? (
            <>
              <Button size="sm" onClick={onActivate}>
                Activar
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                Rechazar
              </Button>
            </>
          ) : null}
          {grant.status === "active" ? (
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ActivateDialog({
  grant,
  onClose,
}: {
  grant: AdminGrantRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const activateFn = useServerFn(activateVisibilityGrant);
  const [cycle, setCycle] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  useMemo(() => {
    if (grant) {
      setCycle(grant.cycle);
      setAmount(String(grant.plan?.base_price_mxn ?? ""));
      setAutoRenew(false);
      setNotes("");
    }
  }, [grant?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!grant) return;
      return activateFn({
        data: {
          grant_id: grant.id,
          cycle,
          amount_paid_mxn: Number(amount) || 0,
          auto_renew: autoRenew,
          admin_notes: notes || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Paquete activado");
      qc.invalidateQueries({ queryKey: ["cms", "visibility-grants"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo activar"),
  });

  return (
    <Dialog open={!!grant} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Activar paquete</DialogTitle>
        </DialogHeader>
        {grant ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">{grant.business?.name}</p>
              <p className="text-xs text-muted-foreground">
                {grant.plan?.name} · solicitado {fmtDate(grant.created_at)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciclo</Label>
                <Select value={cycle} onValueChange={setCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual (1 mes)</SelectItem>
                    <SelectItem value="quarterly">Trimestral (3 meses)</SelectItem>
                    <SelectItem value="semiannual">Semestral (6 meses)</SelectItem>
                    <SelectItem value="annual">Anual (12 meses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto cobrado (MXN)</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Auto-renovar</p>
                <p className="text-xs text-muted-foreground">
                  Requerirá un nuevo cobro al vencer.
                </p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
            <div>
              <Label>Notas internas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Folio, forma de pago, comentarios…"
                rows={3}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !cycle}
          >
            {mutation.isPending ? "Activando…" : "Confirmar y activar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialog({
  mode,
  grant,
  onClose,
}: {
  mode: "reject" | "cancel" | null;
  grant: AdminGrantRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const rejectFn = useServerFn(rejectVisibilityGrant);
  const cancelFn = useServerFn(cancelVisibilityGrant);
  const [reason, setReason] = useState("");

  useMemo(() => {
    if (mode) setReason("");
  }, [mode, grant?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!grant || !mode) return;
      const args = { data: { grant_id: grant.id, reason } };
      return mode === "reject" ? rejectFn(args) : cancelFn(args);
    },
    onSuccess: () => {
      toast.success(mode === "reject" ? "Solicitud rechazada" : "Paquete cancelado");
      qc.invalidateQueries({ queryKey: ["cms", "visibility-grants"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo procesar"),
  });

  const open = mode !== null && !!grant;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "reject" ? "Rechazar solicitud" : "Cancelar paquete activo"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Motivo (visible en historial)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={
              mode === "reject"
                ? "Ej. datos de facturación incompletos"
                : "Ej. cortesía finalizada, reembolso emitido"
            }
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant={mode === "cancel" ? "destructive" : "default"}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || reason.trim().length < 3}
          >
            {mutation.isPending ? "Procesando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}