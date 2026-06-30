/**
 * Workspace Engine v2.0 — Public contracts (15.10.5a).
 *
 * Estos tipos son el contrato canónico de:
 *  - WorkspaceDefinition: registro declarativo de un workspace (Founder,
 *    Portal, Concierge, CMS, Cuenta, o cualquier nuevo dominio futuro).
 *  - NavItem / CommandEntry: alimentan el Navigation Registry (sidebar,
 *    bottom-nav, command palette, switcher).
 *  - AluxContext / AluxAction / AluxCapability: alimentan el Alux Copilot
 *    Layer transversal del Workspace Engine.
 *
 * El núcleo del Workspace NUNCA referencia workspaces concretos.
 * Todo se descubre por los registries.
 */
import type { LucideIcon } from "lucide-react";

export type WorkspaceAccent =
  | "primary"
  | "selva"
  | "cenote"
  | "atardecer"
  | "caliza"
  | "muted";

export type NavSurface = "sidebar" | "bottom" | "palette" | "switcher";

export interface NavItem {
  id: string;
  workspaceId: string;
  label: string;
  icon: LucideIcon;
  to: string;
  group?: string;
  order?: number;
  /** Superficies en las que aparece el item. Default: sidebar + palette. */
  surfaces?: NavSurface[];
  /** Marcado como acción primaria del workspace (centro del bottom-nav). */
  primary?: boolean;
  /** Badge dinámico opcional (notificaciones, conteos). */
  badge?: () => string | number | null | undefined;
  /** Roles requeridos. Vacío = cualquier sesión. */
  roles?: string[];
  /** Atajo de teclado descriptivo (ej. "g h"). Sólo display en palette. */
  shortcut?: string;
}

export interface CommandEntry {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  icon?: LucideIcon;
  shortcut?: string;
  workspaceId?: string;
  /** Ejecutor; recibe utilidades del contexto del palette. */
  run: (ctx: CommandRunContext) => void | Promise<void>;
  /** Predicado opcional de visibilidad en tiempo de render. */
  when?: () => boolean;
}

export interface CommandRunContext {
  navigate: (to: string) => void;
  setWorkspace: (workspaceId: string) => void;
  closePalette: () => void;
}

/* ---------------- Alux Copilot Layer ---------------- */

export type AluxImpact = "low" | "medium" | "high";

/** Origen de datos usado por Alux para justificar una recomendación. */
export interface ContextSource {
  id: string;
  label: string;
  /** Tipo libre: "metric" | "entity" | "rule" | "history" | ... */
  kind?: string;
  /** Valor serializable opcional (snippet visible al usuario). */
  value?: string | number;
}

export type ConfirmPolicy = "none" | "soft" | "strict";

export interface AluxAction {
  id: string;
  label: string;
  description?: string;
  impact?: AluxImpact;
  run: () => void | Promise<void>;
  /* ----- Explainable by Default (15.10.5b) ----- */
  /** Por qué Alux recomienda esta acción (≤200 chars). */
  rationale?: string;
  /** Qué información utilizó. */
  sources?: ContextSource[];
  /** Efecto esperado tras ejecutar la acción. */
  effect?: string;
  /** ¿Es reversible? */
  reversible?: boolean;
  /** Acción de undo si reversible. */
  undo?: () => void | Promise<void>;
  /** Política de confirmación. */
  confirm?: ConfirmPolicy;
}

/** Resumen narrativo + acciones sugeridas en el panel Copiloto. */
export interface AluxContext {
  /** Frase corta (≤140 chars) que abre el panel Copiloto. */
  headline: string | (() => string | Promise<string>);
  /** Cuerpo narrativo opcional. */
  summary?: string | (() => string | Promise<string>);
  /** Acciones de alta señal sugeridas por Alux para este workspace. */
  suggestedActions?: () => AluxAction[] | Promise<AluxAction[]>;
}

/** Capacidad que un workspace expone a Alux (lectura de contexto, etc.). */
export interface AluxCapability {
  id: string;
  label: string;
  /** Devuelve un objeto serializable con contexto del workspace. */
  read?: () => unknown | Promise<unknown>;
}

/* ---------------- Contextual Layer (15.10.5b) ---------------- */

export type SelectionMode = "single" | "multi" | "range";

export interface EntityRef {
  type: string;
  id: string;
  label?: string;
}

export interface EntityDescriptor {
  type: string;
  label: string;
  icon?: LucideIcon;
  /** Clave primaria del entity (default: "id"). */
  primaryKey?: string;
}

export type QuickActionScope = "entity" | "selection" | "workspace";

export interface QuickActionDescriptor {
  id: string;
  label: string;
  icon?: LucideIcon;
  scope: QuickActionScope;
  /** Si scope=entity, tipos compatibles. */
  entityTypes?: string[];
  shortcut?: string;
  run: (ctx: QuickActionRunContext) => void | Promise<void>;
  /** Predicado opcional (se evalúa con el contexto vivo). */
  when?: (ctx: QuickActionRunContext) => boolean;
}

export interface QuickActionRunContext {
  workspaceId: string;
  selection: ReadonlyArray<EntityRef>;
  focused: EntityRef | null;
}

export interface InspectorViewDescriptor {
  /** Tipo de entity al que aplica. */
  entityType: string;
  /** Render del panel (recibe EntityRef ya resuelto). */
  render: (entity: EntityRef) => ReactNodeLike;
}

/** ReactNode sin importar React aquí (evita ciclos en /lib). */
type ReactNodeLike = unknown;

export type WorkspaceViewKind =
  | "list"
  | "board"
  | "calendar"
  | "map"
  | "timeline"
  | "detail";

export interface ViewDescriptor {
  id: string;
  label: string;
  kind: WorkspaceViewKind;
}

/** Contrato declarativo del contexto operativo de un workspace. */
export interface WorkspaceContextDefinition {
  workspaceId: string;
  entities: EntityDescriptor[];
  selectionModes: SelectionMode[];
  inspectors?: InspectorViewDescriptor[];
  quickActions?: QuickActionDescriptor[];
  views?: ViewDescriptor[];
}

/** Snapshot serializable del contexto operativo. */
export interface ContextSnapshot {
  workspaceId: string;
  route: string;
  viewId: string | null;
  selection: EntityRef[];
  selectionMode: SelectionMode;
  focused: EntityRef | null;
  /** Scroll y filtros se serializan opacos. */
  scroll?: number;
  filters?: Record<string, unknown>;
  ts: number;
}

/* ---------------- Workspace Definition ---------------- */

export interface WorkspaceDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon: LucideIcon;
  accent?: WorkspaceAccent;
  /** Ruta raíz del workspace (ej. "/admin", "/portal"). */
  rootPath: string;
  /** Roles que pueden ver el workspace en el switcher. */
  roles?: string[];
  /** Items de navegación declarativos. */
  navigation: NavItem[];
  /** Comandos contribuidos al Command Palette cuando el ws está activo. */
  commands?: CommandEntry[];
  /** Contexto/capacidades expuestas al Alux Copilot Layer. */
  alux?: AluxContext;
  aluxCapabilities?: AluxCapability[];
  /** Contrato declarativo del Contextual Layer (15.10.5b). */
  context?: WorkspaceContextDefinition;
}