/**
 * ShareSheet — hoja compacta de compartir (sin iconos permanentes en la UI).
 *
 * Reutiliza los primitivos existentes (`ui/sheet`, `lib/toast`) y las APIs
 * nativas del navegador. No crea backend, persistencia ni superficie paralela:
 * comparte una URL canónica ya existente. Nunca expone instrucciones internas
 * de Alux — sólo título turístico + URL + marca.
 */
import { AtSign, Copy, Facebook, Linkedin, Mail, MessageCircle, Pin, Send, Share2, Twitter } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  /** Encabezado contextual de la hoja. */
  readonly heading?: string;
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

/**
 * Marketing orgánico: cada canal recibe su propia etiqueta UTM para medir
 * qué red trae visitantes. Nunca sobrescribe UTMs ya presentes.
 */
export function withShareUtm(href: string, source: string): string {
  try {
    const u = new URL(href);
    if (u.searchParams.has("utm_source")) return u.toString();
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "social_share");
    u.searchParams.set("utm_campaign", "compartir");
    return u.toString();
  } catch {
    return href;
  }
}

export function ShareSheet({
  open,
  onOpenChange,
  title,
  url,
  text,
  heading = "Compartir",
}: ShareSheetProps) {
  const href = absoluteUrl(url);
  const message = `${title} — ${text ? `${text} ` : ""}Valladolid.mx · Oriente Maya`;
  const link = (source: string) => withShareUtm(href, source);
  const textFor = (source: string) => `${message}\n${link(source)}`;
  const enc = encodeURIComponent;

  const options: Array<{ key: string; label: string; icon: typeof Copy; run: () => void }> = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      run: () => window.open(`https://wa.me/?text=${enc(textFor("whatsapp"))}`, "_blank"),
    },
    {
      key: "copy",
      label: "Copiar enlace",
      icon: Copy,
      run: () => {
        void navigator.clipboard
          ?.writeText(link("copy"))
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
          `https://www.facebook.com/sharer/sharer.php?u=${enc(link("facebook"))}`,
          "_blank",
        ),
    },
    {
      key: "email",
      label: "Correo",
      icon: Mail,
      run: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${enc(textFor("email"))}`;
      },
    },
    {
      key: "x",
      label: "X",
      icon: Twitter,
      run: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(link("x"))}`,
          "_blank",
        ),
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: Send,
      run: () =>
        window.open(
          `https://t.me/share/url?url=${enc(link("telegram"))}&text=${enc(message)}`,
          "_blank",
        ),
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: Linkedin,
      run: () =>
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link("linkedin"))}`,
          "_blank",
        ),
    },
    {
      key: "pinterest",
      label: "Pinterest",
      icon: Pin,
      run: () =>
        window.open(
          `https://pinterest.com/pin/create/button/?url=${enc(link("pinterest"))}&description=${enc(message)}`,
          "_blank",
        ),
    },
    {
      key: "threads",
      label: "Threads",
      icon: AtSign,
      run: () =>
        window.open(`https://www.threads.net/intent/post?text=${enc(textFor("threads"))}`, "_blank"),
    },
  ];

  const nativeShare = () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    void navigator.share({ title, text: message, url: link("native") }).catch(() => undefined);
    onOpenChange(false);
  };

  const canNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-4 rounded-t-3xl p-4 sm:p-6">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{heading}</SheetTitle>
          <SheetDescription className="sr-only">
            Elige cómo compartir {title}.
          </SheetDescription>
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
