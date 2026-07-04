/**
 * ProductActions — Renderiza la Estrategia de Conversión del Producto
 * (14.40.B v1.1 §3.5) en la superficie pública del Marketplace.
 *
 * Reglas:
 *  - El CTA principal se determina por `conversion_mode` del producto.
 *  - "Añadir al carrito" sólo se muestra cuando
 *    `conversion_mode === 'reservar_en_linea'` y
 *    `accepts_online_payment === true`.
 *  - El plan comercial NO altera la estrategia de conversión.
 *  - La acción secundaria es opcional y aditiva; no sustituye la principal.
 *  - Esquema abierto: nuevas acciones secundarias pueden agregarse sin
 *    cambios al modelo de datos (mode es texto).
 */
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";

export interface ProductActionsProduct {
  id: string;
  conversion_mode: string;
  primary_action_label: string | null;
  secondary_action_mode: string | null;
  secondary_action_label: string | null;
  accepts_online_payment: boolean;
}

const PRIMARY_DEFAULT_LABEL: Record<string, string> = {
  informacion: "Ver información",
  arma_tu_viaje: "Agregar a mi viaje",
  solicitar_cotizacion: "Solicitar cotización",
  reservar_en_linea: "Reservar en línea",
  whatsapp: "Contactar por WhatsApp",
  telefono: "Llamar por teléfono",
  sitio_externo: "Visitar sitio",
};

const SECONDARY_DEFAULT_LABEL: Record<string, string> = {
  arma_tu_viaje: "Agregar a mi viaje",
  guardar_para_despues: "Guardar para después",
  solicitar_cotizacion: "Solicitar cotización",
  whatsapp: "Escribir por WhatsApp",
  telefono: "Llamar",
  sitio_externo: "Visitar sitio",
};

function PrimaryButton({
  product,
}: {
  product: ProductActionsProduct;
}) {
  const mode = product.conversion_mode || "informacion";
  if (mode === "reservar_en_linea" && product.accepts_online_payment) {
    return <AddToCartButton productId={product.id} />;
  }
  const label =
    product.primary_action_label ?? PRIMARY_DEFAULT_LABEL[mode] ?? "Ver más";
  return (
    <button
      type="button"
      disabled
      title="Acción habilitada en próximas etapas"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground opacity-80"
    >
      {label}
    </button>
  );
}

function SecondaryAction({
  product,
}: {
  product: ProductActionsProduct;
}) {
  const mode = product.secondary_action_mode;
  if (!mode) return null;
  const label =
    product.secondary_action_label ?? SECONDARY_DEFAULT_LABEL[mode] ?? mode;

  // "guardar_para_despues" se materializa hoy con el botón de favoritos
  // (la infraestructura ya existe en Etapa 4).
  if (mode === "guardar_para_despues") {
    return <FavoriteButton entityKind="product" entityId={product.id} />;
  }
  return (
    <button
      type="button"
      disabled
      title="Acción secundaria habilitada en próximas etapas"
      className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground"
    >
      {label}
    </button>
  );
}

export function ProductActions({ product }: { product: ProductActionsProduct }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrimaryButton product={product} />
      <SecondaryAction product={product} />
      <RequestConciergeButton kind="product" productId={product.id} />
    </div>
  );
}