import { filterXSS, whiteList } from "xss";

/** HTML editorial seguro: conserva formato y enlaces, elimina scripts,
 *  manejadores de eventos y URLs `javascript:`. Funciona en servidor y navegador. */
export function sanitizeEditorialHtml(html: string): string {
  return filterXSS(html, {
    whiteList: {
      ...whiteList,
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title", "loading"],
      section: ["class"],
      div: ["class"],
      span: ["class"],
      p: ["class"],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
    onTagAttr(tag, name, value) {
      if (tag === "iframe" && name === "src") {
        return /^https:\/\//i.test(value) ? `src="${value.replace(/"/g, "&quot;")}"` : "";
      }
      return undefined;
    },
  });
}

/** CSS generado a partir de configuración: impide cerrar la etiqueta <style>. */
export function escapeStyleText(css: string): string {
  return css.replace(/</g, "\\3c ").replace(/>/g, "\\3e ");
}
