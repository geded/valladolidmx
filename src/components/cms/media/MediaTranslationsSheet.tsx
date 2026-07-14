/**
 * H3·A3.b · Panel multilenguaje del Media Intelligence Pipeline.
 *
 * Muestra los 6 idiomas oficiales, permite sugerir con IA por locale
 * y aprobar/guardar como humano — sin sobrescribir contenido humano
 * existente (protección en DB + UI).
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listMediaTranslations,
  suggestMediaAlt,
  saveMediaMetadata,
  approveMediaTranslation,
} from "@/lib/cms/media-intelligence.functions";
import { Button } from "@/components/ui/button";

const LOCALES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
] as const;

type Locale = (typeof LOCALES)[number]["code"];

interface Row {
  locale: string;
  alt_text: string | null;
  alt_text_ai: string | null;
  source: string | null;
  review_state: string | null;
}

export function MediaTranslationsSheet({
  mediaId,
  onClose,
}: {
  mediaId: string;
  onClose: () => void;
}) {
  const list = useServerFn(listMediaTranslations);
  const suggest = useServerFn(suggestMediaAlt);
  const save = useServerFn(saveMediaMetadata);
  const approve = useServerFn(approveMediaTranslation);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<Locale | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Locale, string>>>({});

  useEffect(() => {
    void list({ data: { mediaId } })
      .then((r) => setRows((r.rows as Row[]) ?? []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error"));
  }, [mediaId, list]);

  const byLocale = useMemo(() => {
    const map: Record<string, Row | undefined> = {};
    for (const r of rows) map[r.locale] = r;
    return map;
  }, [rows]);

  async function refresh() {
    const r = await list({ data: { mediaId } });
    setRows((r.rows as Row[]) ?? []);
  }

  async function handleSuggest(locale: Locale) {
    setBusy(locale);
    try {
      const r = await suggest({ data: { mediaId, locale } });
      if ("skipped" in r && r.skipped) {
        toast.info("ALT humano preservado.");
      } else {
        toast.success(`Propuesta IA generada en ${locale.toUpperCase()}.`);
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error IA");
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove(locale: Locale) {
    setBusy(locale);
    try {
      const draft = drafts[locale];
      await approve({ data: { mediaId, locale, altText: draft } });
      toast.success(`ALT aprobado (${locale.toUpperCase()}).`);
      setDrafts((d) => ({ ...d, [locale]: undefined }));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveHuman(locale: Locale) {
    const alt = drafts[locale];
    if (!alt) return;
    setBusy(locale);
    try {
      await save({ data: { mediaId, locale, alt_text: alt, source: "human" } });
      toast.success(`Guardado como humano (${locale.toUpperCase()}).`);
      setDrafts((d) => ({ ...d, [locale]: undefined }));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Traducciones · Media Intelligence</h2>
          <p className="text-[11px] text-muted-foreground">
            IA propone · Humano decide. Un idioma por fila. El humano siempre gana.
          </p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {LOCALES.map(({ code, label }) => {
            const r = byLocale[code];
            const draft =
              drafts[code] ??
              r?.alt_text ??
              r?.alt_text_ai ??
              "";
            const isHuman = r?.source === "human";
            const isApproved = r?.review_state === "approved";
            return (
              <div
                key={code}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase">{code}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {isHuman && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        humano
                      </span>
                    )}
                    {!isHuman && isApproved && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        IA aprobada
                      </span>
                    )}
                    {!isHuman && !isApproved && r?.alt_text_ai && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        IA pendiente
                      </span>
                    )}
                    {!r && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        sin traducción
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  className="w-full resize-y rounded border border-border bg-background px-2 py-1 text-sm"
                  rows={2}
                  placeholder={`ALT en ${label}`}
                  value={draft}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [code]: e.target.value }))
                  }
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === code}
                    onClick={() => handleSuggest(code)}
                  >
                    {busy === code ? "…" : "Sugerir IA"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === code || !drafts[code]}
                    onClick={() => handleSaveHuman(code)}
                  >
                    Guardar como humano
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      busy === code ||
                      (!r?.alt_text_ai && !drafts[code] && code !== "es")
                    }
                    onClick={() => handleApprove(code)}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <footer className="flex justify-end border-t border-border px-4 py-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </footer>
      </div>
    </div>
  );
}