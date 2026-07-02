# Auto-traducción al guardar + idiomas configurables

## Contexto

Hoy los textos del constructor viven como strings sueltos y algunos locales estáticos (`de/fr/it/pt`) traen el nombre de la marca hardcodeado. Además la lista de idiomas está fija en `src/config/languages.ts` — no es administrable.

## Solución en dos capas

### 1) Fuente única de idiomas activos (administrable)

Nueva tabla `platform_locales` en la BD:

```text
code (pk)   | label        | native_label | flag | is_default | is_active | sort_order
"es"        | "Español"    | "Español"    | 🇲🇽  | true       | true      | 0
"en"        | "English"    | "English"    | 🇺🇸  | false      | true      | 1
...
```

- Server fn público `listActiveLocales()` — lo consumen constructor, traductor, `LanguageSwitcher` e `I18nProvider`.
- Server fn admin `upsertLocale` / `deactivateLocale` (super_admin/admin).
- UI mínima en `/cms/sistema/idiomas` para activar/desactivar y marcar el default.
- `src/config/languages.ts` queda como fallback SSR y se marca deprecated.

### 2) Auto-traducción al guardar en el Experience Builder

- Idioma base = `is_default` (hoy `es`). El constructor **sólo edita en el idioma base** (se elimina cualquier selector por idioma en el `AutoInspector`).
- Schema de campos de texto en `page_compositions.blocks` migra a:

```json
{ "base": "es", "values": { "es": "...", "en": "...", "de": "..." }, "hashes": { "es": "..." } }
```

- Al guardar la composición, un server fn `translatePageComposition` (auth):
  1. Carga los idiomas activos vía `listActiveLocales()`.
  2. Para cada campo cuyo `hashes[base]` cambió, pide traducción por lotes a **Lovable AI Gateway** (`google/gemini-3-flash-preview`) devolviendo JSON con `{ locale: { fieldPath: "texto" } }`.
  3. Rellena `values` para cada idioma activo excepto el base.
  4. Si falla la traducción, guarda igual y muestra toast "Traducciones pendientes". Nunca bloquea el guardado.
- Renderer público: helper `resolveText(field, activeLocale)` con fallback `values[activeLocale] ?? values[base]`.
- **Formato consistente en todos los idiomas**: el prompt instruye preservar mayúsculas iniciales, puntuación final, saltos de línea, emojis, y nombres propios (`Valladolid`, `Oriente Maya`, `Yucatán`, `Alux`) sin traducir. Longitud limitada al ±20% del original para no romper layouts.

### Auditoría de locales estáticos

Corregir en `src/i18n/locales/{de,fr,it,pt}.json` cualquier valor hardcodeado con "Oriente Maya · Yucatán" u otras cadenas ES que deberían estar traducidas (hero eyebrow ya, más los que aparezcan al revisar).

## Migración de datos

Migración idempotente que recorre `page_compositions.blocks` y envuelve strings en `{ base, values: { <base>: <string> }, hashes: { <base>: sha1 } }`. Los renderers ya toleran ambos formatos durante la transición.

## Archivos afectados

- **Nuevo**: tabla `platform_locales` (migración + GRANTs + RLS pública SELECT, escritura sólo admin).
- **Nuevo**: `src/lib/i18n/locales.functions.ts` (list/upsert/deactivate).
- **Nuevo**: `src/lib/cms/translate-composition.functions.ts` (Lovable AI Gateway).
- **Nuevo**: ruta `/cms/sistema/idiomas` (admin CRUD).
- **Modificado**: `src/lib/experience-builder/schema.ts` — tipo `LocalizedText`.
- **Modificado**: `src/components/experience-builder/AutoInspector.tsx` — quitar selector de idioma.
- **Modificado**: `src/lib/experience-builder/composition-renderer.tsx` — `resolveText`.
- **Modificado**: `src/lib/cms/eb-studio.functions.ts` / save — invocar traductor tras guardar.
- **Modificado**: `src/i18n/context.tsx` + `LanguageSwitcher.tsx` — leer idiomas activos.
- **Modificado**: `src/i18n/locales/{de,fr,it,pt}.json` — limpieza.

## Orden de entrega (una historia a la vez)

1. **H1** Tabla `platform_locales` + `listActiveLocales()` + fallback → consumen `I18nProvider` y `LanguageSwitcher`.
2. **H2** UI admin `/cms/sistema/idiomas`.
3. **H3** Schema `LocalizedText` + migración de datos + `resolveText` en renderer (retrocompatible).
4. **H4** Quitar selector de idioma del `AutoInspector`; forzar edición en idioma base.
5. **H5** Server fn `translatePageComposition` + integración en save.
6. **H6** Auditoría y limpieza de `de/fr/it/pt.json`.

Cada historia entrega: implementación + smoke visible + rollback + reporte.

## Riesgos

- Costo/latencia por save → mitigado con hash por campo (sólo traduce cambios).
- Traducciones cortas pueden sonar raras → se puede añadir override manual por idioma como mejora futura (no en este alcance).

## Aprobación

¿Arranco por **H1** (tabla + fn + consumo en I18nProvider y switcher)? Confirma y avanzo.
