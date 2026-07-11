/**
 * WelcomeOnboardingModal — Ola 1 del Onboarding del Viajero.
 *
 * Modal ligero (60s) que se muestra la primera vez que un viajero
 * autenticado entra a /cuenta y aún no tiene un perfil turístico
 * significativo. Captura 3 mínimos que alimentan el Travel Workspace
 * (Política 07) y por tanto el contexto de Alux (Política 06):
 *
 *   1. Idioma preferido.
 *   2. Ventana temporal del viaje (trip_context.travel_window).
 *   3. Tipo de grupo → travel_style + trip_context.party_size.
 *
 * Reglas:
 *  - Saltable siempre; nada bloqueante.
 *  - Editable después desde /cuenta/perfil.
 *  - Persiste vía `upsertMyTravelerProfile` (whitelist server-side).
 *  - "Ahora no" se recuerda localmente por 7 días para no molestar.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  upsertMyTravelerProfile,
  type TravelerProfile,
} from "@/lib/traveler/traveler-account.functions";

type Lang = "es" | "en" | "fr" | "de" | "it" | "pt";
type Window = "este_mes" | "proximos_3_meses" | "mas_adelante" | "no_se";
type Party = "solo" | "pareja" | "familiar" | "amigos";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
];

const WINDOW_OPTIONS: { value: Window; label: string }[] = [
  { value: "este_mes", label: "Este mes" },
  { value: "proximos_3_meses", label: "En los próximos 3 meses" },
  { value: "mas_adelante", label: "Más adelante" },
  { value: "no_se", label: "Aún no lo sé" },
];

const PARTY_OPTIONS: {
  value: Party;
  label: string;
  style: "aventura" | "romantico" | "familiar" | "cultura";
  partySize: number;
}[] = [
  { value: "solo", label: "Solo/a", style: "aventura", partySize: 1 },
  { value: "pareja", label: "En pareja", style: "romantico", partySize: 2 },
  { value: "familiar", label: "Con familia", style: "familiar", partySize: 4 },
  { value: "amigos", label: "Con amigos", style: "cultura", partySize: 3 },
];

const DISMISS_KEY = "vmx.onboarding.welcome.dismissedAt";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function detectDefaultLang(): Lang {
  if (typeof navigator === "undefined") return "es";
  const raw = (navigator.language || "es").slice(0, 2).toLowerCase();
  const found = LANG_OPTIONS.find((o) => o.value === raw);
  return (found?.value ?? "es") as Lang;
}

function isProfileEmpty(p: TravelerProfile | null | undefined): boolean {
  if (!p) return true;
  const noStyle = !p.travel_style;
  const noInterests = !p.interests || p.interests.length === 0;
  const noWindow = !p.trip_context?.travel_window;
  return noStyle && noInterests && noWindow;
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
}

export interface WelcomeOnboardingModalProps {
  profile: TravelerProfile | null | undefined;
  ready: boolean;
}

export function WelcomeOnboardingModal({
  profile,
  ready,
}: WelcomeOnboardingModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<Lang>(detectDefaultLang());
  const [travelWindow, setTravelWindow] = useState<Window | null>(null);
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!isProfileEmpty(profile)) return;
    if (recentlyDismissed()) return;
    setOpen(true);
  }, [ready, profile]);

  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertMyTravelerProfile);
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof upsertFn>[0]) => upsertFn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["traveler", "profile"] });
      toast.success("¡Listo! Alux ya puede personalizar tus recomendaciones.");
    },
    onError: (e) => toast.error(`No se pudo guardar: ${(e as Error).message}`),
  });

  const canFinish = useMemo(() => Boolean(lang && travelWindow && party), [
    lang,
    travelWindow,
    party,
  ]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  }

  async function finish() {
    if (!canFinish || !party || !travelWindow) return;
    const partyOpt = PARTY_OPTIONS.find((p) => p.value === party)!;
    const winLabel =
      WINDOW_OPTIONS.find((w) => w.value === travelWindow)?.label ?? "";
    await mutation.mutateAsync({
      data: {
        preferred_language: lang,
        travel_style: partyOpt.style,
        trip_context: {
          party_size: partyOpt.partySize,
          travel_window: winLabel,
        },
      },
    });
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bienvenido al Oriente Maya de Yucatán</DialogTitle>
          <DialogDescription>
            3 preguntas rápidas para que Alux te recomiende mejor. Puedes
            editarlas después en tu perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Paso {step} de 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-6 rounded-full ${
                    n <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">¿En qué idioma prefieres viajar?</p>
              <div className="grid grid-cols-2 gap-2">
                {LANG_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    active={lang === o.value}
                    onClick={() => setLang(o.value)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">¿Cuándo piensas viajar?</p>
              <div className="grid grid-cols-1 gap-2">
                {WINDOW_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    active={travelWindow === o.value}
                    onClick={() => setTravelWindow(o.value)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">¿Con quién vas a viajar?</p>
              <div className="grid grid-cols-2 gap-2">
                {PARTY_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    active={party === o.value}
                    onClick={() => setParty(o.value)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Ahora no
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Atrás
              </Button>
            )}
            {step < 3 && (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !lang) || (step === 2 && !travelWindow)
                }
              >
                Continuar
              </Button>
            )}
            {step === 3 && (
              <Button
                size="sm"
                onClick={finish}
                disabled={!canFinish || mutation.isPending}
              >
                {mutation.isPending ? "Guardando…" : "Descubrir Oriente Maya de Yucatán"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3 py-2 text-sm transition ${
        active
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}