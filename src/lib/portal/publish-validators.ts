/**
 * publish-validators.ts — Sub-ola 2.4a · Fase D.
 *
 * Sistema reutilizable de validadores de publicación por tipo de
 * contenido. Requisito Founder: la lógica de checklist no debe estar
 * embebida en las RPCs. La RPC `publish_business_product` sólo aplica
 * reglas duras (portada, descripción mínima, precio cuando aplica,
 * autorización híbrida). El validator layer se ejecuta client-side y
 * server-side (previo a la RPC) para dar feedback rico y bloquear early.
 *
 * Contrato uniforme: cada validador declara `kind`, corre un check
 * puro sobre un snapshot inmutable del contenido y devuelve issues con
 * severidad y remediación. Añadir un nuevo tipo (Promotion, Business,
 * Event, etc.) es registrar un objeto — cero cambios al motor.
 */

export type PublishSeverity = "block" | "warn" | "info";

export type PublishIssue = {
  code: string;
  severity: PublishSeverity;
  message: string;
  fixHint?: string;
  field?: string;
};

export type PublishCheckResult = {
  ok: boolean;
  blocking: PublishIssue[];
  warnings: PublishIssue[];
  info: PublishIssue[];
};

export interface PublishValidator<Snapshot> {
  readonly kind: string;
  validate(snapshot: Snapshot): PublishIssue[];
}

const registry = new Map<string, PublishValidator<unknown>>();

export function registerPublishValidator<S>(v: PublishValidator<S>) {
  registry.set(v.kind, v as unknown as PublishValidator<unknown>);
}

export function getPublishValidator<S>(kind: string): PublishValidator<S> | null {
  return (registry.get(kind) as PublishValidator<S> | undefined) ?? null;
}

export function runPublishChecks<S>(kind: string, snapshot: S): PublishCheckResult {
  const v = getPublishValidator<S>(kind);
  const issues = v ? v.validate(snapshot) : [];
  const blocking = issues.filter((i) => i.severity === "block");
  const warnings = issues.filter((i) => i.severity === "warn");
  const info = issues.filter((i) => i.severity === "info");
  return { ok: blocking.length === 0, blocking, warnings, info };
}

/* ─────────────────  Product validator  ────────────────── */

export type ProductPublishSnapshot = {
  productType: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  price_amount: number | null;
  hasCover: boolean;
  galleryCount: number;
  faqCount: number;
  businessVerified: boolean;
  businessCanSelfPublish: boolean;
  businessPublished: boolean;
};

const REQUIRES_PRICE = new Set([
  "experiencia",
  "hotel",
  "tour",
  "transporte",
  "evento",
]);

export const ProductPublishValidator: PublishValidator<ProductPublishSnapshot> = {
  kind: "product",
  validate(s) {
    const out: PublishIssue[] = [];

    if (!s.businessPublished) {
      out.push({
        code: "business_not_published",
        severity: "block",
        message: "La empresa aún no está publicada.",
        fixHint: "Contacta al equipo Founder para publicar tu ficha de empresa.",
      });
    }

    if (!s.businessVerified && !s.businessCanSelfPublish) {
      out.push({
        code: "not_authorized_to_self_publish",
        severity: "block",
        message:
          "Tu empresa aún no está autorizada para publicación directa.",
        fixHint:
          "Solicita revisión Founder o pide activación de autopublicación.",
      });
    }

    if (!s.hasCover) {
      out.push({
        code: "missing_cover",
        severity: "block",
        message: "Falta imagen de portada.",
        fixHint: "Sube una portada en la sección de Media.",
        field: "cover_media_id",
      });
    }

    if (s.galleryCount < 2) {
      out.push({
        code: "short_gallery",
        severity: "warn",
        message: "Sólo tienes una imagen. Recomendamos 3+ para conversión.",
        field: "gallery",
      });
    }

    const desc = (s.description ?? "").trim();
    if (desc.length < 40) {
      out.push({
        code: "description_too_short",
        severity: "block",
        message: "La descripción debe tener al menos 40 caracteres.",
        field: "description",
      });
    } else if (desc.length < 120) {
      out.push({
        code: "description_thin",
        severity: "warn",
        message: "Descripción corta — considera ampliarla a 120+ caracteres.",
        field: "description",
      });
    }

    if (REQUIRES_PRICE.has(s.productType) && s.price_amount == null) {
      out.push({
        code: "missing_price",
        severity: "block",
        message: `Los productos de tipo "${s.productType}" requieren precio.`,
        field: "price_amount",
      });
    }

    if (s.faqCount === 0) {
      out.push({
        code: "no_faqs",
        severity: "info",
        message: "Agregar FAQs mejora conversión y SEO.",
      });
    }

    if (!s.name || s.name.trim().length < 3) {
      out.push({
        code: "invalid_name",
        severity: "block",
        message: "Nombre inválido.",
        field: "name",
      });
    }

    return out;
  },
};

// Auto-registro. Los futuros validadores (Promotion, Business, Event) se
// añaden aquí con `registerPublishValidator({ kind, validate })`.
registerPublishValidator(ProductPublishValidator);