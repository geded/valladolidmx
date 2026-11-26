import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushEnableButton } from "@/components/notifications/PushEnableButton";
import { isStandaloneDisplay } from "@/lib/navigation/session-context";
import { toast } from "@/lib/toast";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const COPY = {
  taxi: {
    title: "Instala la app para seguir tu taxi",
    body: "Es importante instalarla en tu celular: así recibes los avisos cuando el taxista acepta y llega por ti, y sigues el taxi en el mapa. Sin instalarla recibirás únicamente los correos del viaje. También tendrás a la mano tu itinerario durante todo tu viaje.",
  },
  trip: {
    title: "Instala la app para acompañar tu viaje",
    body: "Es importante instalarla en tu celular: así recibes avisos y alertas de tu viaje, tienes el chat con tu concierge y Alux siempre a la mano, y puedes seguir tu itinerario día por día durante el viaje, incluso con poca señal. Sin instalarla recibirás únicamente correos.",
  },
} as const;

export function TaxiAppInstallCard({ signedIn, purpose = "taxi" }: { signedIn: boolean; purpose?: keyof typeof COPY }) {
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      toast.info(
        "En iPhone usa Compartir → Agregar a pantalla de inicio. En Android abre el menú del navegador y elige Instalar aplicación.",
      );
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          {installed ? <CheckCircle2 className="size-5" /> : <Smartphone className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {installed ? "Aplicación instalada en este celular" : COPY[purpose].title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {COPY[purpose].body}
          </p>
          {!installed ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={install}>
              <Download className="mr-2 size-4" /> Instalar aplicación
            </Button>
          ) : null}
          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            iPhone: Compartir → Agregar a pantalla de inicio. Android: menú → Instalar aplicación.
            Los avisos se activan desde la app publicada, abierta en su propia ventana.
          </p>
        </div>
      </div>
      {signedIn && installed ? (
        <div>
          <div className="flex items-center gap-2 border-t border-border px-4 pt-3 text-xs font-medium">
            <BellRing className="size-4 text-primary" /> Activa los avisos de tu viaje
          </div>
          <PushEnableButton />
        </div>
      ) : null}
    </section>
  );
}
