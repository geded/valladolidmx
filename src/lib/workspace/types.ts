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

export interface AluxAction {
  id: string;
  label: string;
  description?: string;
  impact?: AluxImpact;
  run: () => void | Promise<void>;
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
}