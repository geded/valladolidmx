/**
 * AluxMediaSourceButtons — Dos accesos de apoyo junto al botón de subir
 * de los paneles de imágenes del CMS: buscar una foto en internet/acervos
 * abiertos, o crear una imagen con IA a partir de una descripción.
 *
 * No crea flujo paralelo: la imagen elegida se entrega como archivo al mismo
 * `onUpload` que ya usa la subida desde el equipo (optimización, ampliación
 * opcional con Alux IA y registro gobernado).
 */
import { useState } from "react";
import { Search, Wand2 } from "lucide-react";
import {
  AluxPhotoFinderDialog,
  type AluxPickedPhoto,
} from "@/components/cms/AluxPhotoFinderDialog";

interface Props {
  /** Nombre de la ficha (destino, empresa, producto, zona…) para la consulta. */
  hint: string;
  /** Sitio web del negocio, si aplica. */
  website?: string | null;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function AluxMediaSourceButtons({ hint, website, disabled, onFile }: Props) {
  const [mode, setMode] = useState<"search" | "generate" | null>(null);

  const handlePick = (photo: AluxPickedPhoto) => {
    onFile(photo.file);
    setMode(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMode("search")}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-60"
      >
        <Search className="size-3.5 text-alux" aria-hidden />
        Buscar con IA
      </button>
      <button
        type="button"
        onClick={() => setMode("generate")}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-60"
      >
        <Wand2 className="size-3.5 text-alux" aria-hidden />
        Crear con IA
      </button>

      {mode ? (
        <AluxPhotoFinderDialog
          open
          initialMode={mode}
          initialQuery={hint}
          website={website ?? null}
          onClose={() => setMode(null)}
          onPick={handlePick}
        />
      ) : null}
    </>
  );
}
