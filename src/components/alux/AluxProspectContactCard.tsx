/**
 * CRM Prospectos · Fase 1 — tarjeta para dejar nombre y WhatsApp.
 *
 * Aparece dentro del hilo de Alux sólo cuando el servidor lo indica
 * (`contactOffer`, máximo dos veces por plática) y nunca bloquea la ayuda.
 * El teléfono va directo al servidor del CRM; Alux (el modelo) no lo recibe.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { submitAluxProspectContact } from "@/lib/crm/prospects.functions";
import {
  PROSPECT_CONSENT_TEXT,
  cleanFirstName,
  normalizeWhatsApp,
  type ContactOfferReason,
} from "@/lib/crm/prospect-rules";

type Locale = "es" | "en" | "fr" | "de" | "it" | "pt";

const COPY = {
  es: {
    title: "¿Te ayudamos a darle seguimiento?",
    body: "Deja tu nombre y WhatsApp y un concierge de Valladolid.mx te escribe con opciones y los mejores precios.",
    name: "Tu nombre",
    phone: "WhatsApp",
    phoneHint: "Con lada si no es de México, por ejemplo +1 555 123 4567",
    consent: PROSPECT_CONSENT_TEXT,
    submit: "Enviar",
    dismiss: "Ahora no",
    badName: "Escribe tu nombre.",
    badPhone: "Revisa tu número de WhatsApp.",
    needConsent: "Marca la casilla para que podamos escribirte.",
    failed: "No pudimos guardar tus datos. Intenta de nuevo en un momento.",
    tooMany: "Ya recibimos tus datos. Un concierge te escribirá pronto.",
    saved: (n: string) => `¡Gracias, ${n}! Un concierge te escribirá por WhatsApp. Puedes seguir platicando conmigo.`,
  },
  en: {
    title: "Want us to follow up?",
    body: "Leave your name and WhatsApp and a Valladolid.mx concierge will message you with options and the best prices.",
    name: "Your name",
    phone: "WhatsApp",
    phoneHint: "Include your country code, e.g. +1 555 123 4567",
    consent:
      "I agree that a Valladolid.mx concierge may message me on WhatsApp about my trip. I can ask them to stop at any time.",
    submit: "Send",
    dismiss: "Not now",
    badName: "Please enter your name.",
    badPhone: "Please check your WhatsApp number.",
    needConsent: "Tick the box so we can message you.",
    failed: "We couldn't save your details. Please try again in a moment.",
    tooMany: "We already have your details. A concierge will message you soon.",
    saved: (n: string) => `Thanks, ${n}! A concierge will message you on WhatsApp. Keep chatting with me anytime.`,
  },
} as const;

export interface AluxProspectContactCardProps {
  readonly sessionKey: string;
  readonly reason: ContactOfferReason;
  readonly locale?: Locale;
  readonly destinationSlug?: string | null;
  readonly trip?: {
    readonly items?: ReadonlyArray<{ kind: string; targetId: string | null; title: string | null }>;
    readonly partySize?: number | null;
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly durationDays?: number | null;
    readonly interests?: readonly string[];
  };
  readonly onSaved: (firstName: string) => void;
  readonly onDismiss: () => void;
}

export function AluxProspectContactCard(props: AluxProspectContactCardProps) {
  const t = props.locale && props.locale !== "es" ? COPY.en : COPY.es;
  const submitFn = useServerFn(submitAluxProspectContact);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  if (savedName) {
    return (
      <p
        role="status"
        className="ml-8 flex items-start gap-2 rounded-2xl border border-success/30 bg-success/5 px-3 py-2 text-[12px] leading-snug text-foreground"
      >
        <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
        {t.saved(savedName)}
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const first = cleanFirstName(name);
    if (!first) return setError(t.badName);
    if (!normalizeWhatsApp(phone)) return setError(t.badPhone);
    if (!consent) return setError(t.needConsent);
    setBusy(true);
    try {
      const trip = props.trip;
      const res = await submitFn({
        data: {
          sessionKey: props.sessionKey,
          firstName: first,
          whatsapp: phone,
          consent: true,
          ...(props.locale ? { locale: props.locale } : {}),
          reason: props.reason,
          destinationSlug: props.destinationSlug ?? null,
          ...(trip
            ? {
                trip: {
                  items: (trip.items ?? []).slice(0, 30).map((it) => ({
                    kind: it.kind,
                    targetId: it.targetId,
                    title: it.title ? it.title.slice(0, 180) : null,
                  })),
                  partySize: trip.partySize ?? null,
                  startDate: trip.startDate ?? null,
                  endDate: trip.endDate ?? null,
                  durationDays: trip.durationDays ?? null,
                  interests: [...(trip.interests ?? [])].slice(0, 16),
                },
              }
            : {}),
        },
      });
      if (res.ok) {
        setSavedName(res.firstName);
        props.onSaved(res.firstName);
      } else if (res.error === "invalid_name") setError(t.badName);
      else if (res.error === "invalid_whatsapp") setError(t.badPhone);
      else if (res.error === "too_many_attempts") setError(t.tooMany);
      else setError(t.failed);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t.title}
      className="ml-8 space-y-2 rounded-2xl border border-alux/25 bg-alux/5 px-3 py-3"
    >
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-alux" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{t.title}</p>
          <p className="text-[12px] leading-snug text-muted-foreground">{t.body}</p>
        </div>
        <button
          type="button"
          onClick={props.onDismiss}
          aria-label={t.dismiss}
          className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px] font-medium text-muted-foreground">
          {t.name}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            maxLength={60}
            className="mt-0.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-alux/40"
          />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          {t.phone}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder="999 123 4567"
            className="mt-0.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-alux/40"
          />
        </label>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{t.phoneHint}</p>
      <label className="flex items-start gap-2 text-[11px] leading-snug text-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-alux"
        />
        <span>{t.consent}</span>
      </label>
      {error ? (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={props.onDismiss}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted"
        >
          {t.dismiss}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-alux px-4 text-[13px] font-semibold text-alux-foreground hover:bg-alux/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {t.submit}
        </button>
      </div>
    </form>
  );
}
