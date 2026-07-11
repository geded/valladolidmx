/**
 * /portal/canjes — Ola 3 · Historial de canjes del negocio.
 *
 * Muestra los cupones canjeados de la empresa activa con filtros
 * (rango de fechas, promoción, canal) + KPIs y exportación CSV.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, QrCode, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listBusinessRedemptions,
  type BusinessRedemptionRow,
} from "@/lib/promotions/coupons.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/canjes")({
  component: RedemptionsPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setId(detail ?? null);
    };
    window.addEventListener("portal:active-business-changed", handler);
    return () =>
      window.removeEventListener("portal:active-business-changed", handler);
  }, []);
  return id;
}

function RedemptionsPage() {
  const businessId = useActiveBusinessId();
  const list = useServerFn(listBusinessRedemptions);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [channel, setChannel] = useState<"" | "qr" | "code">("");
  const [promo, setPromo] = useState<string>("");

  const query = useQuery({
    queryKey: ["portal-redemptions", businessId, from, to, channel, promo],
    enabled: !!businessId,
    queryFn: async () => {
      const rows = await list({
        data: {
          business_id: businessId!,
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to + "T23:59:59").toISOString() : null,
          channel: channel || null,
          promotion_slug: promo || null,
          limit: 300,
        },
      });
      return rows;
    },
  });

  const rows = query.data ?? [];

  const promoOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.promotion_slug))).sort();
  }, [rows]);

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    let today = 0,
      week = 0,
      month = 0;
    const promoCount = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.redeemed_at);
      if (d >= startOfDay) today++;
      if (d >= startOfWeek) week++;
      if (d >= startOfMonth) month++;
      promoCount.set(
        r.promotion_slug,
        (promoCount.get(r.promotion_slug) ?? 0) + 1,
      );
    }
    const top =
      [...promoCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { today, week, month, top };
  }, [rows]);

  const exportCsv = () => {
    const header = [
      "fecha",
      "codigo",
      "titulo",
      "descuento",
      "canal",
      "viajero",
      "pais",
      "staff",
      "promo_slug",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          new Date(r.redeemed_at).toISOString(),
          r.code,
          csvSafe(r.title),
          r.discount_percent ?? "",
          r.redeemed_channel ?? "",
          csvSafe(r.traveler_name ?? ""),
          r.traveler_country_code ?? "",
          csvSafe(r.redeemed_by_name ?? ""),
          r.promotion_slug,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `canjes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            Portal empresa
          </p>
          <h1 className="text-2xl font-semibold">Historial de canjes</h1>
          <p className="text-sm text-muted-foreground">
            Auditoría de todos los cupones digitales canjeados en esta empresa.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/canjear">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Canjear
          </Link>
        </Button>
      </header>

      {!businessId && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Selecciona una empresa activa arriba para ver el historial.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Hoy" value={kpis.today} />
        <Kpi label="Últimos 7 días" value={kpis.week} />
        <Kpi label="Últimos 30 días" value={kpis.month} />
        <Kpi label="Promo top" value={kpis.top} small />
      </div>

      {/* Filtros */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Canal</label>
          <Select
            value={channel || "all"}
            onValueChange={(v) => setChannel(v === "all" ? "" : (v as "qr" | "code"))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="qr">QR</SelectItem>
              <SelectItem value="code">Código</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Promoción</label>
          <Select
            value={promo || "all"}
            onValueChange={(v) => setPromo(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {promoOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={!rows.length}
            className="w-full"
          >
            <Download className="mr-2 size-4" aria-hidden />
            Exportar CSV
          </Button>
        </div>
      </section>

      {/* Tabla */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {query.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Aún no hay cupones canjeados con estos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Cupón</th>
                  <th className="px-3 py-2">Viajero</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Staff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <RedemptionRow key={r.coupon_id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  small = false,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          small
            ? "mt-1 truncate text-base font-semibold"
            : "mt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RedemptionRow({ r }: { r: BusinessRedemptionRow }) {
  return (
    <tr className="border-t border-border">
      <td className="whitespace-nowrap px-3 py-2 text-xs">
        {new Date(r.redeemed_at).toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-3 py-2">
        <div className="font-medium">{r.title}</div>
        <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-lg leading-none">
            {countryFlag(r.traveler_country_code)}
          </span>
          <span>{r.traveler_name ?? "—"}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        {r.redeemed_channel === "qr" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
            <QrCode className="size-3" aria-hidden /> QR
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            <Type className="size-3" aria-hidden /> Código
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {r.redeemed_by_name ?? "—"}
      </td>
    </tr>
  );
}

function countryFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return "🌎";
  const base = 0x1f1e6 - 65;
  const cc = iso.toUpperCase();
  return String.fromCodePoint(cc.charCodeAt(0) + base, cc.charCodeAt(1) + base);
}

function csvSafe(v: string): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}