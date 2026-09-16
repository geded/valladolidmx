/**
 * AluxPhotoFinderDialog — Búsqueda de fotografías de licencia libre verificable
 * (Wikimedia Commons y Openverse) para las fichas del CMS.
 *
 * No sube nada por su cuenta: entrega la foto elegida al flujo gobernado de
 * siempre (optimización, ampliación opcional con Alux IA, original inmutable y
 * derechos declarados). Sólo editores y administradores.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import {
  aluxFetchPhotoBytes,
  aluxFindPhotos,
  type OwnerContact,
  type PhotoCandidate,
} from "@/lib/cms/alux-autofill.functions";

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
  onPick: (photo: AluxPickedPhoto) => void;
}

export function AluxPhotoFinderDialog({
  open,
  onClose,
  initialQuery,
  website,
  onPick,
}: AluxPhotoFinderDialogProps) {
  const find = useServerFn(aluxFindPhotos);
  const fetchBytes = useServerFn(aluxFetchPhotoBytes);

  const [query, setQuery] = useState(initialQuery);
  const [site, setSite] = useState(website ?? "");
  const [pasted, setPasted] = useState("");
  const [photos, setPhotos] = useState<PhotoCandidate[]>([]);
  const [contacts, setContacts] = useState<OwnerContact[]>([]);
  const [usedQuery, setUsedQuery] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const search = async () => {
    if (query.trim().length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await find({
        data: { query: query.trim(), website: site.trim() || null },
      });
      setPhotos(res.photos);
      setUsedQuery(res.relaxed ? res.usedQuery : null);
      setSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "forbidden"
          ? "Esta búsqueda está reservada a editores y administradores."
          : "No pudimos consultar los acervos en este momento.",
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar fotos con Alux"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
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
              disabled={!pasted.trim().startsWith("https://") || picking !== null}
              onClick={() =>
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
                })
              }
              className="h-10 shrink-0 rounded-pill border border-border px-3 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
            >
              Traer copia
            </button>
          </div>
        </div>

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
              No encontramos fotos de esto exactamente como lo escribiste. Prueba con el nombre
              del lugar o la sede (por ejemplo «Palacio Municipal de Valladolid, Yucatán») o pega
              la página del negocio o del evento en el campo de arriba: de ahí traemos sus propias
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
      </div>
    </div>
  );
}
