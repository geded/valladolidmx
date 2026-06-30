import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "online" | "reconnecting" | "offline";

export function ConnectivityIndicator({ className }: { className?: string }) {
  const [state, setState] = useState<State>("online");

  useEffect(() => {
    const apply = () => setState(navigator.onLine ? "online" : "offline");
    apply();
    const onOnline = () => {
      setState("reconnecting");
      window.setTimeout(() => setState("online"), 600);
    };
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const labelMap: Record<State, string> = {
    online: "Conectado",
    reconnecting: "Reconectando",
    offline: "Sin conexión",
  };

  const Icon = state === "offline" ? WifiOff : state === "reconnecting" ? RefreshCw : Wifi;
  const tone =
    state === "online"
      ? "text-success"
      : state === "reconnecting"
        ? "text-warning"
        : "text-muted-foreground";

  return (
    <span
      role="status"
      aria-live="polite"
      title={labelMap[state]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", state === "reconnecting" && "animate-spin")} aria-hidden />
      <span className="hidden sm:inline">{labelMap[state]}</span>
    </span>
  );
}