import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyOmxdsTheme,
  OMXDS_THEME_STORAGE_KEY,
  resolveOmxdsTheme,
  type OmxdsTheme,
} from "@/lib/theme/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<OmxdsTheme>("sol");

  useEffect(() => {
    const root = document.documentElement;
    const initial = resolveOmxdsTheme(
      root.dataset.theme ?? window.localStorage.getItem(OMXDS_THEME_STORAGE_KEY),
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    applyOmxdsTheme(initial, root);
    setTheme(initial);
  }, []);

  const nextTheme = theme === "sol" ? "luna" : "sol";
  const Icon = theme === "sol" ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={`Cambiar a tema ${nextTheme === "sol" ? "Sol" : "Luna"}`}
      aria-pressed={theme === "luna"}
      title={`Tema actual: ${theme === "sol" ? "Sol" : "Luna"}`}
      className="fixed right-4 top-20 z-40 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-raised transition-colors motion-reduce:transition-none"
      onClick={() => {
        applyOmxdsTheme(nextTheme, document.documentElement);
        window.localStorage.setItem(OMXDS_THEME_STORAGE_KEY, nextTheme);
        setTheme(nextTheme);
      }}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
