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

export function TaxiAppInstallCard({ signedIn }: { signedIn: boolean }) {
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
            {installed ? "Aplicación instalada en este celular" : "Instala la app para seguir tu taxi"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Sin instalarla no tendrás seguimiento en vivo ni alertas en la aplicación; recibirás
            únicamente los correos del viaje. El taxista también debe instalarla para recibir
            avisos y ver su ruta.
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
            <BellRing className="size-4 text-primary" /> Alertas del viaje
          </div>
          <PushEnableButton />
        </div>
      ) : null}
    </section>
  );
}
