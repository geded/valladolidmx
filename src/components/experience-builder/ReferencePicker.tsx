import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  listRegionsCms,
  listDestinationsCms,
  listZonesCms,
  listCategoriesCms,
  listBusinessesCms,
  listProductsCms,
} from "@/lib/cms/reads.functions";

type RefKind =
  | "destination"
  | "business"
  | "product"
  | "region"
  | "zone"
  | "category"
  | "event"
  | "promotion"
  | "page"
  | "media_asset";

type Row = { id: string; label: string; hint?: string };

const KIND_META: Record<string, { title: string; empty: string }> = {
  destination: { title: "Destino", empty: "No hay destinos" },
  business: { title: "Empresa", empty: "No hay empresas" },
  product: { title: "Producto", empty: "No hay productos" },
  region: { title: "Región", empty: "No hay regiones" },
  zone: { title: "Zona", empty: "No hay zonas" },
  category: { title: "Categoría", empty: "No hay categorías" },
  event: { title: "Evento", empty: "No hay eventos" },
  promotion: { title: "Promoción", empty: "No hay promociones" },
  page: { title: "Página", empty: "No hay páginas" },
  media_asset: { title: "Medio", empty: "No hay medios" },
};

async function fetchRows(kind: string, search: string): Promise<Row[]> {
  const params = { data: { limit: 25, offset: 0, search: search || undefined } } as const;
  try {
    switch (kind) {
      case "region": {
        const r = await listRegionsCms(params);
        return (r.rows ?? []).map((x: { id: string; name: string; slug: string }) => ({ id: x.id, label: x.name, hint: x.slug }));
      }
      case "destination": {
        const r = await listDestinationsCms(params);
        return (r.rows ?? []).map((x: { id: string; name: string; slug: string }) => ({ id: x.id, label: x.name, hint: x.slug }));
      }
      case "zone": {
        const r = await listZonesCms(params);
        return (r.rows ?? []).map((x: { id: string; name: string; slug: string }) => ({ id: x.id, label: x.name, hint: x.slug }));
      }
      case "category": {
        const r = await listCategoriesCms(params);
        return (r.rows ?? []).map((x: { id: string; name: string; slug: string }) => ({ id: x.id, label: x.name, hint: x.slug }));
      }
      case "business": {
        const r = await listBusinessesCms(params);
        return (r.rows ?? []).map((x: { id: string; display_name: string; slug: string }) => ({ id: x.id, label: x.display_name, hint: x.slug }));
      }
      case "product": {
        const r = await listProductsCms(params);
        return (r.rows ?? []).map((x: { id: string; name: string; slug: string }) => ({ id: x.id, label: x.name, hint: x.slug }));
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export function ReferencePicker({
  kind,
  value,
  onChange,
  className,
}: {
  kind: RefKind | string | undefined;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  className?: string;
}) {
  const meta = KIND_META[kind ?? ""] ?? { title: "Referencia", empty: "Sin resultados" };
  const supported = Boolean(KIND_META[kind ?? ""] && kind !== "event" && kind !== "promotion" && kind !== "page" && kind !== "media_asset");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open || !supported) return;
    setLoading(true);
    const t = setTimeout(async () => {
      const rs = await fetchRows(String(kind), search);
      setRows(rs);
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [open, search, kind, supported]);

  // Resolver etiqueta del valor actual
  useEffect(() => {
    if (!value || !supported) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const rs = await fetchRows(String(kind), "");
      if (cancelled) return;
      const hit = rs.find((r) => r.id === value);
      if (hit) setSelected(hit);
      else setSelected({ id: value, label: value, hint: "ID sin resolver" });
    })();
    return () => {
      cancelled = true;
    };
  }, [value, kind, supported]);

  const label = useMemo(() => {
    if (!value) return `Elegir ${meta.title.toLowerCase()}…`;
    return selected?.label ?? value;
  }, [value, selected, meta.title]);

  if (!supported) {
    return (
      <input
        className={className}
        placeholder={`ID de ${kind ?? "referencia"}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${className ?? ""} flex w-full items-center justify-between gap-2 text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
        <span className="flex items-center gap-1">
          {value ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar selección"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
                setSelected(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(undefined);
                  setSelected(null);
                }
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          ) : null}
          <ChevronDown className="size-3 text-muted-foreground" />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border border-border bg-popover p-1 shadow-lg">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2">
            <Search className="size-3 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${meta.title.toLowerCase()}…`}
              className="h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="mt-1 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Cargando…
              </div>
            ) : rows.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-muted-foreground">{meta.empty}</p>
            ) : (
              <ul role="listbox" className="flex flex-col">
                {rows.map((r) => {
                  const isSel = r.id === value;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(r.id);
                          setSelected(r);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground ${
                          isSel ? "bg-accent/50" : ""
                        }`}
                      >
                        <span className="flex flex-col overflow-hidden">
                          <span className="truncate">{r.label}</span>
                          {r.hint ? (
                            <span className="truncate text-[10px] text-muted-foreground">{r.hint}</span>
                          ) : null}
                        </span>
                        {isSel ? <Check className="size-3 shrink-0 text-primary" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}