/**
 * /continuar/$token — enlace personal del prospecto (CRM Prospectos · Fase 3).
 *
 * El concierge o Alux lo manda por WhatsApp. Saluda por su nombre, muestra
 * lo que ya platicó y le pide sólo crear su cuenta (o entrar). Al volver con
 * sesión se canjea: su viaje queda en Mi Viaje y su expediente en CRM Arma
 * tu viaje; si el enlace es de pago, sigue a la confirmación de la compra.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { PublicShell } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { useAuth } from "@/hooks/useAuth";
import { rememberAuthReturnPath } from "@/lib/navigation/session-context";
import { getProspectInvitePublic, redeemProspectInvite, type RedeemResult } from "@/lib/crm/closure.functions";
import { toClosureLanguage, type ClosureLanguage } from "@/lib/crm/closure-rules";
import { clearPendingInvite, rememberPendingInvite } from "@/lib/crm/pending-invite";

export const Route = createFileRoute("/continuar/$token")({
  head: () =>
    buildPublicHead({
      title: `Tu viaje te espera · ${SITE.name}`,
      description: "Tu enlace personal para guardar tu viaje con tu concierge de Valladolid.mx.",
      path: "/continuar",
      noindex: true,
    }),
  component: ContinueInvitePage,
});

type Copy = {
  hello: (n: string) => string;
  intro: string;
  introPay: (p: string) => string;
  seen: string;
  dates: (d: string) => string;
  people: (n: number) => string;
  create: string;
  signin: string;
  working: string;
  done: string;
  invalid: string;
  expired: string;
  used: string;
  otherAccount: string;
  failed: string;
  retry: string;
  back: string;
};

const COPY: Record<ClosureLanguage, Copy> = {
  es: {
    hello: (n) => `Hola ${n}, tu viaje te espera`,
    intro: "Guarda lo que platicaste con Alux y tu concierge te arma la propuesta. Solo crea tu cuenta; tus datos ya vienen escritos.",
    introPay: (p) => `Para reservar «${p}» crea tu cuenta y confirma el pago. Tus datos ya vienen escritos.`,
    seen: "Lo que ya platicamos",
    dates: (d) => `Desde el ${d}`,
    people: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,
    create: "Crear mi cuenta y continuar",
    signin: "Ya tengo cuenta",
    working: "Guardando tu viaje…",
    done: "¡Listo! Tu viaje ya está en Mi Viaje y tu concierge lo tiene.",
    invalid: "Este enlace no es válido.",
    expired: "Este enlace ya venció. Escríbele a tu concierge para que te mande uno nuevo.",
    used: "Este enlace ya se usó. Entra con tu cuenta para ver tu viaje.",
    otherAccount: "Este enlace pertenece a otra cuenta. Entra con la cuenta con la que te registraste.",
    failed: "No pudimos guardar tu viaje. Inténtalo de nuevo en un momento.",
    retry: "Intentar de nuevo",
    back: "Ir al inicio",
  },
  en: {
    hello: (n) => `Hi ${n}, your trip is waiting`,
    intro: "Save what you talked about with Alux and your concierge will prepare your proposal. Just create your account; your details are already filled in.",
    introPay: (p) => `To book “${p}”, create your account and confirm the payment. Your details are already filled in.`,
    seen: "What we talked about",
    dates: (d) => `From ${d}`,
    people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
    create: "Create my account and continue",
    signin: "I already have an account",
    working: "Saving your trip…",
    done: "Done! Your trip is in My Trip and your concierge has it.",
    invalid: "This link is not valid.",
    expired: "This link has expired. Ask your concierge for a new one.",
    used: "This link was already used. Sign in to see your trip.",
    otherAccount: "This link belongs to another account. Sign in with the account you registered with.",
    failed: "We couldn't save your trip. Please try again in a moment.",
    retry: "Try again",
    back: "Go to home",
  },
  fr: {
    hello: (n) => `Bonjour ${n}, votre voyage vous attend`,
    intro: "Enregistrez ce dont vous avez parlé avec Alux et votre concierge préparera votre proposition. Créez simplement votre compte ; vos données sont déjà remplies.",
    introPay: (p) => `Pour réserver « ${p} », créez votre compte et confirmez le paiement.`,
    seen: "Ce dont nous avons parlé",
    dates: (d) => `À partir du ${d}`,
    people: (n) => `${n} ${n === 1 ? "personne" : "personnes"}`,
    create: "Créer mon compte et continuer",
    signin: "J'ai déjà un compte",
    working: "Enregistrement de votre voyage…",
    done: "C'est fait ! Votre voyage est dans Mon voyage et votre concierge l'a reçu.",
    invalid: "Ce lien n'est pas valide.",
    expired: "Ce lien a expiré. Demandez-en un nouveau à votre concierge.",
    used: "Ce lien a déjà été utilisé. Connectez-vous pour voir votre voyage.",
    otherAccount: "Ce lien appartient à un autre compte.",
    failed: "Nous n'avons pas pu enregistrer votre voyage. Réessayez dans un instant.",
    retry: "Réessayer",
    back: "Accueil",
  },
  de: {
    hello: (n) => `Hallo ${n}, deine Reise wartet`,
    intro: "Speichere, worüber du mit Alux gesprochen hast, und dein Concierge erstellt dein Angebot. Erstelle nur dein Konto; deine Daten sind schon ausgefüllt.",
    introPay: (p) => `Um „${p}“ zu buchen, erstelle dein Konto und bestätige die Zahlung.`,
    seen: "Worüber wir gesprochen haben",
    dates: (d) => `Ab ${d}`,
    people: (n) => `${n} ${n === 1 ? "Person" : "Personen"}`,
    create: "Konto erstellen und weiter",
    signin: "Ich habe schon ein Konto",
    working: "Deine Reise wird gespeichert…",
    done: "Fertig! Deine Reise ist in Meine Reise und dein Concierge hat sie.",
    invalid: "Dieser Link ist ungültig.",
    expired: "Dieser Link ist abgelaufen. Bitte deinen Concierge um einen neuen.",
    used: "Dieser Link wurde schon benutzt. Melde dich an, um deine Reise zu sehen.",
    otherAccount: "Dieser Link gehört zu einem anderen Konto.",
    failed: "Wir konnten deine Reise nicht speichern. Versuch es gleich noch einmal.",
    retry: "Erneut versuchen",
    back: "Zur Startseite",
  },
  it: {
    hello: (n) => `Ciao ${n}, il tuo viaggio ti aspetta`,
    intro: "Salva quello di cui hai parlato con Alux e il tuo concierge preparerà la proposta. Crea solo il tuo account; i tuoi dati sono già inseriti.",
    introPay: (p) => `Per prenotare «${p}» crea il tuo account e conferma il pagamento.`,
    seen: "Quello di cui abbiamo parlato",
    dates: (d) => `Dal ${d}`,
    people: (n) => `${n} ${n === 1 ? "persona" : "persone"}`,
    create: "Crea il mio account e continua",
    signin: "Ho già un account",
    working: "Stiamo salvando il tuo viaggio…",
    done: "Fatto! Il tuo viaggio è in Il mio viaggio e il tuo concierge lo ha ricevuto.",
    invalid: "Questo link non è valido.",
    expired: "Questo link è scaduto. Chiedine uno nuovo al tuo concierge.",
    used: "Questo link è già stato usato. Accedi per vedere il tuo viaggio.",
    otherAccount: "Questo link appartiene a un altro account.",
    failed: "Non siamo riusciti a salvare il tuo viaggio. Riprova tra un momento.",
    retry: "Riprova",
    back: "Vai alla home",
  },
  pt: {
    hello: (n) => `Olá ${n}, sua viagem está esperando`,
    intro: "Salve o que você conversou com o Alux e o seu concierge prepara a proposta. Só crie sua conta; seus dados já estão preenchidos.",
    introPay: (p) => `Para reservar “${p}”, crie sua conta e confirme o pagamento.`,
    seen: "O que já conversamos",
    dates: (d) => `A partir de ${d}`,
    people: (n) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`,
    create: "Criar minha conta e continuar",
    signin: "Já tenho conta",
    working: "Salvando sua viagem…",
    done: "Pronto! Sua viagem está em Minha viagem e o seu concierge já a recebeu.",
    invalid: "Este link não é válido.",
    expired: "Este link expirou. Peça um novo ao seu concierge.",
    used: "Este link já foi usado. Entre na sua conta para ver sua viagem.",
    otherAccount: "Este link pertence a outra conta.",
    failed: "Não conseguimos salvar sua viagem. Tente novamente em instantes.",
    retry: "Tentar novamente",
    back: "Ir para o início",
  },
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function ContinueInvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const viewFn = useServerFn(getProspectInvitePublic);
  const redeemFn = useServerFn(redeemProspectInvite);
  const view = useQuery({
    queryKey: ["crm-invite-public", token],
    queryFn: () => viewFn({ data: { token } }),
    retry: false,
    staleTime: 60_000,
  });
  const [redeem, setRedeem] = useState<RedeemResult | "working" | null>(null);
  const started = useRef(false);

  const lang = toClosureLanguage(view.data && view.data.status === "valid" ? view.data.language : "es");
  const t = COPY[lang];

  useEffect(() => {
    if (loading || !user || started.current) return;
    started.current = true;
    setRedeem("working");
    void (async () => {
      try {
        const r = await redeemFn({ data: { token } });
        setRedeem(r);
        clearPendingInvite();
        if (r.ok) {
          window.setTimeout(() => {
            if (r.orderId) void navigate({ to: "/cuenta/checkout/$orderId", params: { orderId: r.orderId } });
            else void navigate({ to: "/mi-viaje" });
          }, 1400);
        }
      } catch {
        setRedeem({ ok: false, error: "failed" });
      }
    })();
  }, [loading, user, token, redeemFn, navigate]);

  function goAuth(mode: "signup" | "signin") {
    rememberPendingInvite(token);
    rememberAuthReturnPath(`/continuar/${token}`);
    const params = new URLSearchParams({ mode });
    if (view.data?.status === "valid") {
      if (view.data.email) params.set("email", view.data.email);
      params.set("name", view.data.firstName);
    }
    window.location.assign(`/auth?${params.toString()}`);
  }

  const crumbs = [{ label: "Inicio", to: "/" }, { label: "Tu viaje" }];

  let body: React.ReactNode;
  if (view.isLoading || loading) {
    body = <p className="text-sm text-muted-foreground">…</p>;
  } else if (redeem === "working") {
    body = <p className="text-sm text-muted-foreground">{t.working}</p>;
  } else if (redeem && redeem.ok) {
    body = <p className="text-base font-medium text-foreground">{t.done}</p>;
  } else if (redeem && !redeem.ok) {
    const msg =
      redeem.error === "expired"
        ? t.expired
        : redeem.error === "used"
          ? t.used
          : redeem.error === "other_account" || redeem.error === "account_has_prospect"
            ? t.otherAccount
            : redeem.error === "failed"
              ? t.failed
              : t.invalid;
    body = (
      <Message
        text={msg}
        back={t.back}
        retry={redeem.error === "failed" ? { label: t.retry, onClick: () => window.location.reload() } : undefined}
      />
    );
  } else if (!view.data || view.data.status !== "valid") {
    const st = view.data?.status;
    body = <Message text={st === "expired" ? t.expired : st === "used" ? t.used : t.invalid} back={t.back} />;
  } else {
    const v = view.data;
    body = (
      <div className="space-y-5">
        <header>
          <h1 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">{t.hello(v.firstName)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {v.purpose === "pay" && v.product ? t.introPay(v.product.name) : t.intro}
          </p>
        </header>
        {v.product ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold">{v.product.name}</p>
            <p className="text-sm text-muted-foreground">{money(v.product.price, v.product.currency)}</p>
          </div>
        ) : null}
        {v.destinations.length || v.items.length || v.startDate || v.partySize ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{t.seen}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                v.destinations.join(", ") || null,
                v.startDate ? t.dates(v.startDate) : null,
                v.partySize ? t.people(v.partySize) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {v.items.length ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                {v.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="min-h-11" onClick={() => goAuth("signup")}>
            {t.create}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => goAuth("signin")}>
            {t.signin}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PublicShell crumbs={crumbs} compactCrumbsOnMobile className="pb-12 pt-5 sm:pt-8">
      <div className="mx-auto max-w-xl">{body}</div>
    </PublicShell>
  );
}

function Message({
  text,
  back,
  retry,
}: {
  text: string;
  back: string;
  retry?: { label: string; onClick: () => void } | undefined;
}) {
  return (
    <div className="space-y-4">
      <p className="text-base text-foreground">{text}</p>
      {retry ? (
        <Button type="button" className="mr-2 min-h-11" onClick={retry.onClick}>
          {retry.label}
        </Button>
      ) : null}
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted"
      >
        {back}
      </Link>
    </div>
  );
}
