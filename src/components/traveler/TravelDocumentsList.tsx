/**
 * TravelDocumentsList — CV5.1.5
 *
 * Vista "Documentos" del Workspace del Viajero. Cuando el viaje está
 * confirmado, presenta el voucher y el recibo del folio como tarjetas
 * editoriales, cada una con acceso a una vista imprimible/PDF (via el
 * diálogo de impresión del navegador → "Guardar como PDF").
 *
 * Cero infra nueva: reusa `getConciergeOrder` y una ruta imprimible
 * dedicada bajo `/cuenta/documentos/$orderId`.
 */
import { Link } from "@tanstack/react-router";
import { FileText, Receipt, Printer, ArrowRight } from "lucide-react";

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
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function TravelDocumentsList({ orderId, folio, paidAt }: Props) {
  const paidTxt = fmtDate(paidAt);
  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-serif text-lg text-foreground">
          Documentos de tu viaje
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Folio {folio}
          {paidTxt ? ` · Confirmado el ${paidTxt}` : ""}
        </p>
      </header>

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
                  <h3 className="font-serif text-base text-foreground">
                    {doc.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {doc.body}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
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
        <strong>Imprimir → Guardar como PDF</strong> en tu navegador.
      </p>
    </section>
  );
}