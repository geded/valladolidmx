/**
 * AluxPhotoFinderDialog — Búsqueda editorial de fotografías relevantes en la
 * web, Google y acervos abiertos para las fichas del CMS.
 *
 * No sube nada por su cuenta: entrega la foto elegida al flujo gobernado de
 * siempre (optimización, ampliación opcional con Alux IA, original inmutable y
 * derechos declarados). Sólo editores y administradores.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaFinderKey, readMediaFinder, writeMediaFinder } from "@/lib/cms/media-finder-session";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Loader2, MapPin, Search, Sparkles, Wand2, X } from "lucide-react";
import { streamImage } from "@/lib/stream-image";
import {
  aluxFetchPhotoBytes,
  aluxFindPhotos,
  type OwnerContact,
  type PhotoCandidate,
} from "@/lib/cms/alux-autofill.functions";
import { useCmsTerritory } from "@/lib/cms/territory-context";
import { useCmsTerritoryOptions } from "@/components/cms/CmsTerritoryBar";

export interface AluxPickedPhoto {
  file: File;
  author: string;
  license: string;
  sourceUrl: string;
  title: string;
  provider: string;
}

export interface AluxPhotoFinderDialogProps {
  open: boolean;
  onClose: () => void;
  /** Consulta inicial: nombre de la ficha + destino. */
  initialQuery: string;
  /** Sitio web del negocio: de ahí se traen sus propias fotos. */
  website?: string | null;
  /** Territorio explícito. Si se omite, se usa el destino de trabajo del CMS. */
  place?: string | null;
  /** Pestaña inicial: buscar fotos o crear con IA. */
  initialMode?: "search" | "generate";
  onPick: (photo: AluxPickedPhoto) => void;
  /** Selección múltiple: entrega todas las fotos marcadas de una vez. */
  onPickMany?: (photos: AluxPickedPhoto[]) => void;
}

/** Quita del texto escrito las palabras del destino de trabajo (ya implícito). */
function stripPlaceTokens(value: string, place: string | null): string {
  if (!value || !place) return value ?? "";
  const tokens = place
    .split(/[,·]/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase())
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return value;
  const kept = value
    .split(/\s+/)
    .filter((w) => !tokens.includes(w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()));
  const next = kept.join(" ").trim();
  return next.length > 0 ? next : "";
}

export function AluxPhotoFinderDialog({
  open,
  onClose,
  initialQuery,
  website,
  place,
  initialMode,
  onPick,
  onPickMany,
}: AluxPhotoFinderDialogProps) {
  const find = useServerFn(aluxFindPhotos);
  const fetchBytes = useServerFn(aluxFetchPhotoBytes);

  const { territory } = useCmsTerritory();
  const options = useCmsTerritoryOptions();
  const workingPlace = useMemo(() => {
    if (place && place.trim()) return place.trim();
    const destination = options.destinations.find((d) => d.id === territory.destinationId);
    if (!destination) return null;
    const zone = options.zones.find((z) => z.id === territory.zoneId);
    return [zone?.name, destination.name, "Yucatán, México"].filter(Boolean).join(", ");
  }, [place, options.destinations, options.zones, territory.destinationId, territory.zoneId]);

  // El destino ya lo aporta el contexto del CMS: no se repite en el buscador.
  const [query, setQuery] = useState(() => stripPlaceTokens(initialQuery, workingPlace));
  const [site, setSite] = useState(website ?? "");
  const [pasted, setPasted] = useState("");
  const [photos, setPhotos] = useState<PhotoCandidate[]>([]);
  const [contacts, setContacts] = useState<OwnerContact[]>([]);
  const [usedQuery, setUsedQuery] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modo Generar con IA
  const [mode, setMode] = useState<"search" | "generate">(initialMode ?? "search");
  const [genPrompt, setGenPrompt] = useState(() => stripPlaceTokens(initialQuery, workingPlace));
  const [genImage, setGenImage] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Conserva búsqueda, resultados y creación al salir y volver a la app.
  const sessionKey = useMemo(() => mediaFinderKey(initialQuery), [initialQuery]);
  const restoredRef = useRef(false);
  useEffect(() => {
    const s = readMediaFinder<{
      query: string; site: string; pasted: string; photos: PhotoCandidate[];
      contacts: OwnerContact[]; usedQuery: string | null; searched: boolean;
      mode: "search" | "generate"; genPrompt: string; genImage: string | null;
    }>(sessionKey);
    if (s) {
      setQuery(s.query ?? ""); setSite(s.site ?? ""); setPasted(s.pasted ?? "");
      setPhotos(s.photos ?? []); setContacts(s.contacts ?? []);
      setUsedQuery(s.usedQuery ?? null); setSearched(!!s.searched);
      if (s.mode) setMode(s.mode);
      setGenPrompt(s.genPrompt ?? ""); setGenImage(s.genImage ?? null);
    }
    restoredRef.current = true;
  }, [sessionKey]);
  useEffect(() => {
    if (!restoredRef.current) return;
    writeMediaFinder(sessionKey, {
      query, site, pasted, photos, contacts, usedQuery, searched, mode, genPrompt, genImage,
    });
  }, [sessionKey, query, site, pasted, photos, contacts, usedQuery, searched, mode, genPrompt, genImage]);

  if (!open) return null;

  const search = async () => {
    if (loading) return;
    if (query.trim().length < 3) {
      setError("Escribe al menos tres letras de lo que buscas (por ejemplo: cenote, fachada).");
      return;
    }
    setLoading(true);
    setError(null);
    setPhotos([]);
    setContacts([]);
    setUsedQuery(null);
    setSearched(false);
    try {
      const res = await find({
        data: { query: query.trim(), website: site.trim() || null, place: workingPlace },
      });

      setPhotos(res.photos);
      setContacts(res.contacts ?? []);
      setUsedQuery(res.relaxed ? res.usedQuery : null);
      setSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "forbidden"
          ? "Esta búsqueda está reservada a editores y administradores."
          : message.startsWith("role_check_failed")
            ? "No pudimos comprobar tus permisos de edición. Vuelve a intentarlo en unos segundos."
            : /timeout|network|fetch|failed/i.test(message)
              ? "La búsqueda tardó demasiado. Intenta de nuevo con una frase más corta."
              : "No pudimos consultar los acervos en este momento. Inténtalo otra vez.",
      );
    } finally {
      setLoading(false);
    }
  };

  const choose = async (photo: PhotoCandidate) => {
    if (picking) return;
    setPicking(photo.url);
    setError(null);
    try {
      const res = await fetchBytes({ data: { url: photo.url } });
      const bin = atob(res.bytesBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const ext = res.mime.split("/")[1]?.split("+")[0] ?? "jpg";
      const base = photo.title.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "") || "foto";
      const file = new File([bytes], `${base}.${ext}`, {
        type: res.mime,
        lastModified: Date.now(),
      });
      onPick({
        file,
        author: photo.author,
        license: photo.license,
        sourceUrl: photo.sourceUrl,
        title: photo.title,
        provider: photo.provider,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "photo_too_large"
          ? "Esa foto es demasiado pesada. Elige otra."
          : "No pudimos traer esa foto. Elige otra.",
      );
    } finally {
      setPicking(null);
    }
  };

  const generate = async () => {
    if (genPrompt.trim().length < 3 || genLoading) return;
    setGenLoading(true);
    setGenError(null);
    setGenImage(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const fullPrompt = workingPlace
        ? `${genPrompt.trim()}, ${workingPlace}, México. Fotografía editorial de alta calidad, realista, sin texto, sin marcas de agua.`
        : `${genPrompt.trim()}. Fotografía editorial de alta calidad, realista, sin texto, sin marcas de agua.`;
      await streamImage(
        "/api/generate-image",
        { prompt: fullPrompt },
        (dataUrl, isFinal) => {
          setGenImage(dataUrl);
          if (isFinal) setGenLoading(false);
        },
        controller.signal,
      );
      if (!controller.signal.aborted) setGenLoading(false);
    } catch (err) {
      if (controller.signal.aborted) {
        setGenLoading(false);
        return;
      }
      const msg = err instanceof Error ? err.message : "";
      setGenError(
        /content_policy|moderation/i.test(msg)
          ? "El prompt fue rechazado. Prueba con una descripción más genérica."
          : /failed|error/i.test(msg)
            ? "No se pudo generar la imagen. Intenta con otra descripción."
            : msg || "Error generando imagen",
      );
      setGenLoading(false);
    }
  };

  const useGenerated = () => {
    if (!genImage) return;
    const bin = atob(genImage.split(",")[1] ?? "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], `alux-ai-${Date.now()}.png`, {
      type: "image/png",
      lastModified: Date.now(),
    });
    onPick({
      file,
      author: "Alux IA",
      license: "Generada por IA",
      sourceUrl: "",
      title: genPrompt.trim().slice(0, 80),
      provider: "Alux IA",
    });
    onClose();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar fotos con Alux"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl sm:h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-alux" aria-hidden />
              Buscar fotos con Alux
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Busca fotos del propio sitio del negocio y de acervos abiertos. La foto elegida entra
              por el mismo flujo: se optimiza, puede ampliarse y conserva autor y fuente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {/* Conmutador Buscar / Generar con IA */}
        <div className="flex gap-1 border-b border-border bg-muted/20 px-4 py-2">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={
              "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition " +
              (mode === "search"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            <Search className="size-3.5" aria-hidden />
            Buscar fotos
          </button>
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={
              "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition " +
              (mode === "generate"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            <Wand2 className="size-3.5" aria-hidden />
            Generar con IA
          </button>
        </div>

        {mode === "search" && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void search();
                }}
                aria-label="Qué foto buscas"
                placeholder={
                  workingPlace ? "Sólo el tema: video mapping, cenote, fachada…" : "Qué foto buscas"
                }
                className="h-10 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading}
              className="h-10 rounded-pill bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>
        )}

        {mode === "search" && workingPlace && (
          <p className="flex items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            Buscando en {workingPlace}. No hace falta escribir el destino.
          </p>
        )}

        {mode === "search" && (
        <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-4 py-2 sm:flex-row">
          <input
            type="url"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="Página del negocio o del evento (https://…)"
            aria-label="Página del negocio o del evento"
            className="h-10 flex-1 rounded-md border border-border bg-background px-2 text-xs"
          />
          <div className="flex flex-1 items-center gap-2">
            <input
              type="url"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="O pega el enlace de una foto (se guarda una copia)"
              aria-label="Enlace directo de una foto"
              className="h-10 flex-1 rounded-md border border-border bg-background px-2 text-xs"
            />
            <button
              type="button"
              disabled={picking !== null}
              onClick={() => {
                if (!pasted.trim().startsWith("https://")) {
                  setError(
                    "Pega en este campo el enlace directo de una foto (debe empezar con https:// y terminar en .jpg, .png o .webp). El primer campo es la página del negocio: para traer sus fotos, usa «Buscar».",
                  );
                  return;
                }
                void choose({
                  url: pasted.trim(),
                  thumbUrl: pasted.trim(),
                  width: 0,
                  height: 0,
                  title: decodeURIComponent(pasted.trim().split("/").pop() ?? "foto").slice(0, 120),
                  author: (() => {
                    try {
                      return new URL(pasted.trim()).hostname.replace(/^www\./, "");
                    } catch {
                      return "";
                    }
                  })(),
                  license: "Publicada por el negocio",
                  sourceUrl: site.trim() || pasted.trim(),
                  provider: "Enlace directo",
                });
              }}
              className="h-10 shrink-0 rounded-pill border border-border px-3 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
            >
              Traer copia
            </button>
          </div>
        </div>
        )}

        {mode === "search" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Buscando fotos de «{query}»…
            </p>
          )}

          {!loading && searched && usedQuery && photos.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              No había resultados exactos; mostramos fotos de «{usedQuery}».
            </p>
          )}

          {!loading && searched && photos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No encontramos fotos de esto exactamente como lo escribiste. Prueba con el nombre del
              lugar o la sede (por ejemplo «Palacio Municipal de Valladolid, Yucatán») o pega la
              página del negocio o del evento en el campo de arriba: de ahí traemos sus propias
              fotos y guardamos una copia nuestra.
            </p>
          )}

          {!loading && contacts.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium">
                Contacto publicado por el titular (para pedir permiso)
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {contacts.map((c) => (
                  <li key={c.sourceUrl}>
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground underline underline-offset-2"
                    >
                      {c.host}
                    </a>
                    {c.emails.length > 0 && <> · {c.emails.join(", ")}</>}
                    {c.phones.length > 0 && <> · {c.phones.join(", ")}</>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.url} className="overflow-hidden rounded-lg border border-border">
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="h-32 w-full bg-muted object-cover"
                />
                <figcaption className="space-y-1 px-2 py-2 text-[11px]">
                  <p className="truncate font-medium" title={photo.title}>
                    {photo.title}
                  </p>
                  <p className="text-muted-foreground">
                    {photo.width > 0 ? `${photo.width}×${photo.height} px · ` : ""}
                    {photo.license}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {photo.author || "Autor no declarado"} · {photo.provider}
                  </p>
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <a
                      href={photo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      fuente
                    </a>
                    <button
                      type="button"
                      onClick={() => void choose(photo)}
                      disabled={picking !== null}
                      className="h-9 rounded-pill border border-border px-3 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {picking === photo.url ? "Trayendo…" : "Usar esta"}
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        )}

        {mode === "generate" && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {genError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {genError}
              </p>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Describe la imagen que necesitas
              </label>
              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void generate();
                  }
                }}
                placeholder={
                  workingPlace
                    ? "Sólo el tema: cenote al amanecer, fachada colonial, gastronomía yucateca…"
                    : "Describe la imagen: foto de un cenote, fachada colonial…"
                }
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={genLoading || genPrompt.trim().length < 3}
                  className="flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {genLoading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Wand2 className="size-3.5" aria-hidden />
                  )}
                  {genLoading ? "Generando…" : "Generar imagen"}
                </button>
                {genLoading && (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="rounded-pill border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {genImage && (
              <div className="space-y-3">
                <figure className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={genImage}
                    alt={genPrompt}
                    className={
                      "w-full bg-muted object-cover transition-[filter] " +
                      (genLoading ? "blur-2xl" : "blur-0")
                    }
                  />
                  <figcaption className="px-2 py-2 text-[11px] text-muted-foreground">
                    <p className="truncate font-medium text-foreground" title={genPrompt}>
                      {genPrompt}
                    </p>
                    <p>Generada por Alux IA · Google Gemini</p>
                  </figcaption>
                </figure>
                {!genLoading && (
                  <button
                    type="button"
                    onClick={useGenerated}
                    className="flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <ImageIcon className="size-3.5" aria-hidden />
                    Usar esta imagen
                  </button>
                )}
              </div>
            )}

            {!genImage && !genLoading && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <Wand2 className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Escribe qué imagen necesitas y Alux la generará con IA.
                  Funciona mejor con descripciones concretas: «cenote al amanecer con luz natural»,
                  «fachada colonial iluminada de noche», «platillo de cochinita pibil sobre madera».
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
