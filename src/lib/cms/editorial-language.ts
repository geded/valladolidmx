import type { ContentStatus } from "@/lib/cms/workflow";

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobado",
  published: "Publicado",
  archived: "Archivado",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Contenido creado",
  updated: "Contenido actualizado",
  transition: "Estado cambiado",
};

export const EDITORIAL_STATUS_ORDER: readonly ContentStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
];

export function getEditorialStatusLabel(status: string | null | undefined): string {
  if (!status) return STATUS_LABELS.draft;
  return STATUS_LABELS[status as ContentStatus] ?? status;
}

export function getEditorialActionLabel(action: string | null | undefined): string {
  if (!action) return "Actividad registrada";
  return ACTION_LABELS[action.toLowerCase()] ?? "Actividad registrada";
}

export function describeEditorialHistory(entry: {
  action?: string | null;
  from_status?: string | null;
  to_status?: string | null;
}): string {
  const action = getEditorialActionLabel(entry.action);
  if (entry.from_status && entry.to_status) {
    return `${action} de ${getEditorialStatusLabel(entry.from_status)} a ${getEditorialStatusLabel(entry.to_status)}`;
  }
  if (entry.to_status) {
    return `${action}: ${getEditorialStatusLabel(entry.to_status)}`;
  }
  return action;
}

export function getEditorialStatusGuidance(status: ContentStatus): string {
  switch (status) {
    case "draft":
      return "El contenido todavía se está preparando. Cuando esté listo, envíalo a revisión.";
    case "in_review":
      return "El contenido espera revisión. Puedes aprobarlo o devolverlo a borrador para corregirlo.";
    case "approved":
      return "El contenido ya fue aprobado y está listo para publicarse.";
    case "published":
      return "El contenido está visible para los visitantes. Puedes archivarlo cuando deje de estar vigente.";
    case "archived":
      return "El contenido está guardado, pero ya no está publicado. Puedes restaurarlo como borrador.";
  }
}