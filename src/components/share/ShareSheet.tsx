/**
 * ShareSheet — hoja compacta de compartir (sin iconos permanentes en la UI).
 *
 * Reutiliza los primitivos existentes (`ui/sheet`, `lib/toast`) y las APIs
 * nativas del navegador. No crea backend, persistencia ni superficie paralela:
 * comparte una URL canónica ya existente. Nunca expone instrucciones internas
 * de Alux — sólo título turístico + URL + marca.
 */
import { useState } from "react";
import { Copy, Facebook, Mail, MessageCircle, Share2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export interface ShareSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Título turístico visible (nunca prompts ni texto técnico). */
  readonly title: string;
  /** URL canónica absoluta o relativa a compartir. */
  readonly url: string;
  /** Texto breve turístico opcional. */
  readonly text?: string;
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

export function ShareSheet({ open, onOpenChange, title, url, text }: ShareSheetProps) {
  const href = absoluteUrl(url);
  const message = `${title} — ${text ? `${text} ` : ""}Valladolid.mx · Oriente Maya`;
  const shareText = `${message}\n${href}`;

  const options: Array<{ key: string; label: string; icon: typeof Copy; run: () => void }> = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      run: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank"),
    },
    {
      key: "copy",
      label: "Copiar enlace",
      icon: Copy,
      run: () => {
        void navigator.clipboard
          ?.writeText(href)
          .then(() => toast.success("Enlace copiado"))
          .catch(() => toast.error("No se pudo copiar el enlace"));
      },
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      run: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(href)}`,
          "_blank",
        ),
    },
    {
      key: "email",
      label: "Correo",
      icon: Mail,
      run: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`;
      },
    },
    {
      key: "x",
      label: "X",
      icon: Share2,
      run: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(href)}`,
          "_blank",
        ),
    },
  ];

  const nativeShare = () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    void navigator.share({ title, text: message, url: href }).catch(() => undefined);
    onOpenChange(false);
  };

  const canNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-4 rounded-t-3xl p-4 sm:p-6">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Compartir ruta</SheetTitle>
        </SheetHeader>
        <p className="line-clamp-2 text-[13px] text-muted-foreground">{title}</p>

        {canNativeShare ? (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          >
            <Share2 className="size-4" aria-hidden />
            Compartir
          </button>
        ) : null}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {options.map(({ key, label, icon: Icon, run }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                run();
                onOpenChange(false);
              }}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 text-[11px] font-medium text-foreground",
                "transition-colors hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Hook mínimo para abrir la hoja desde cualquier acción compacta existente. */
export function useShareSheet() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, openShare: () => setOpen(true) };
}
