/**
 * TravelDocumentsList — CV5.1.5 + CV6 · Documentos sin conexión
 *
 * Vista "Documentos" del Workspace del Viajero. Cuando el viaje está
 * confirmado, presenta el voucher y el recibo del folio como tarjetas
 * editoriales, cada una con acceso a una vista imprimible/PDF (via el
 * diálogo de impresión del navegador → "Guardar como PDF").
 *
 * Además guarda una copia mínima en el propio dispositivo para que el
 * viajero pueda mostrar su folio y sus reservaciones en destino sin señal,
 * y presenta el código QR del folio (generado localmente).
 */
import { useEffect, useState } from "react";
import { meridaLongDate } from "@/lib/time/merida";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Receipt, Printer, ArrowRight, WifiOff, CheckCircle2 } from "lucide-react";
import { getConciergeOrder } from "@/lib/concierge/orders.functions";
import {
  readOfflineDocuments,
  saveOfflineDocuments,
  type OfflineDocumentSnapshot,
} from "@/lib/traveler/offline-documents";
import { TripQrCode } from "@/components/traveler/TripQrCode";

interface Props {
  orderId: string;
  folio: string;
  paidAt: string | null;
}

type Doc = {
  kind: "voucher" | "recibo";
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DOCS: Doc[] = [
  {
    kind: "voucher",
    title: "Voucher del viaje",
    body: "Resumen de tus reservaciones confirmadas. Muéstralo en cada experiencia si te lo piden.",
    icon: FileText,
  },
  {
    kind: "recibo",
    title: "Recibo del pago",
    body: "Comprobante del importe pagado con desglose por reservación.",
    icon: Receipt,
  },
];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return meridaLongDate(iso) || null;
  } catch {
    return null;
  }
}

export function TravelDocumentsList({ orderId, folio, paidAt }: Props) {
  const paidTxt = fmtDate(paidAt);
  const fetchOrder = useServerFn(getConciergeOrder);
  const [offline, setOffline] = useState<OfflineDocumentSnapshot | null>(null);

  const q = useQuery({
    queryKey: ["concierge-order", orderId, "offline-snapshot"],
    queryFn: () => fetchOrder({ data: { orderId } }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    setOffline(readOfflineDocuments(orderId));
  }, [orderId]);

  useEffect(() => {
    if (!q.data) return;
    const saved = saveOfflineDocuments(q.data);
    if (saved) setOffline(saved);
  }, [q.data]);

  const savedTxt = offline ? fmtDate(offline.saved_at) : null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-serif text-lg text-foreground">Documentos de tu viaje</h2>
        <p className="text-[13px] text-muted-foreground">
          Folio {folio}
          {paidTxt ? ` · Confirmado el ${paidTxt}` : ""}
        </p>
      </header>

      <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-soft">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="rounded-xl border border-border/60 bg-white p-3 shadow-soft">
            <TripQrCode folio={folio} size={140} className="block size-[140px]" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="font-serif text-base text-foreground">Tu folio, siempre contigo</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Muestra este código en cada experiencia para identificar tu viaje. Se genera en tu
              teléfono y funciona sin conexión.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-muted/50 px-3 py-1 text-[12px] font-medium text-foreground">
              {offline ? (
                <>
                  <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
                  Disponible sin conexión
                  {savedTxt ? ` · guardado el ${savedTxt}` : ""}
                </>
              ) : (
                <>
                  <WifiOff className="size-3.5 text-muted-foreground" aria-hidden />
                  Preparando tu copia para usar sin conexión…
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          return (
            <li
              key={doc.kind}
              className="group rounded-2xl border border-border/70 bg-card/70 p-5 shadow-soft transition-all hover:shadow-elevated"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base text-foreground">{doc.title}</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">{doc.body}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  PDF · imprimible
                </span>
                <Link
                  to="/cuenta/documentos/$orderId"
                  params={{ orderId }}
                  search={{ doc: doc.kind }}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-soft transition-shadow hover:shadow-elevated"
                >
                  <Printer className="size-3.5" aria-hidden />
                  Ver / Descargar
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="rounded-lg border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
        Para guardarlos como PDF, abre el documento y elige{" "}
        <strong>Imprimir → Guardar como PDF</strong> en tu navegador. Tu copia sin conexión se
        guarda sólo en este dispositivo y se borra sola después de tu viaje.
      </p>
    </section>
  );
}
