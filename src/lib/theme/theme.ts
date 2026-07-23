export const OMXDS_THEME_STORAGE_KEY = "valladolidmx:theme";

export type OmxdsTheme = "sol" | "luna";

export function parseOmxdsTheme(value: unknown): OmxdsTheme | null {
  return value === "sol" || value === "luna" ? value : null;
}

export function resolveOmxdsTheme(
  storedValue: unknown,
  prefersDark: boolean,
): OmxdsTheme {
  return parseOmxdsTheme(storedValue) ?? (prefersDark ? "luna" : "sol");
}

export function applyOmxdsTheme(theme: OmxdsTheme, root: HTMLElement): void {
  root.classList.toggle("dark", theme === "luna");
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "luna" ? "dark" : "light";
}
