## Ola A19 · KB Multilingüe Editorial (Opción B)

Extender `alux_knowledge_entries` para almacenar contenido y embeddings por idioma en los 6 locales activos (es, en, fr, de, it, pt), con fallback automático a español.

### Alcance

- **Idiomas**: los 6 configurados en `platform_locales` (es como fuente canónica).
- **Contenido**: `title`, `body`, `summary`, `tags` traducidos por idioma.
- **Embeddings**: uno por idioma (mejor recall semántico en el idioma del query).
- **Fallback**: si no existe traducción en el idioma pedido → devolver la versión ES marcada como `fallback: true` para que Alux la traduzca on-the-fly en la respuesta.

### Cambios de datos

Nueva tabla `alux_knowledge_translations`:
```
- id uuid pk
- entry_id uuid fk → alux_knowledge_entries
- locale text (es|en|fr|de|it|pt)
- title text
- body text
- summary text
- tags text[]
- embedding vector(1536)
- source: 'human' | 'ai_generated' | 'canonical'
- reviewed_at timestamptz null
- unique(entry_id, locale)
```
La entrada base (`alux_knowledge_entries`) queda como metadata + slug + categoría; el contenido se muda a la tabla de traducciones (fila `es` = canonical). Migración copia el contenido actual como fila `es` con `source='canonical'`.

### RPC actualizado

`match_alux_knowledge(query_embedding, locale, match_count)`:
1. Busca en `alux_knowledge_translations` filtrado por `locale`.
2. Si el top-k no llega al mínimo (ej. score < 0.7 o < 3 resultados), completa con `locale='es'` marcados como `fallback=true`.
3. Devuelve `{ id, title, body, similarity, locale, is_fallback }`.

### Server functions

- `contextualSuggest` y `chat`: usar el `locale` ya cableado (Ola A18) para embed del query + llamar al RPC con ese locale.
- Cuando el chunk viene con `is_fallback=true`, inyectar en prompt: `[FUENTE_ES · TRADUCE AL ${locale}]` para que Alux traduzca al vuelo.

### Backfill (traducción masiva)

Server function admin `translateKnowledgeEntry(entryId, targetLocales[])`:
- Lee la fila `es`.
- Llama al gateway (Gemini 2.5 Flash) con prompt de traducción editorial turística (mantener nombres propios, tono cercano).
- Genera embedding con `openai/text-embedding-3-small`.
- Upsert en `alux_knowledge_translations` con `source='ai_generated'`.

Batch runner `translateAllKnowledge()` (admin-only, throttle 1s):
- Recorre todas las entradas y locales faltantes.
- Reporta progreso a `system_alerts`.

### Admin UI

En `/cms/alux/knowledge` (existente):
- Nueva columna "Idiomas" con chips (es✓ en✓ fr✗…).
- Botón "Traducir con IA" por entrada → dispara `translateKnowledgeEntry`.
- Botón masivo "Traducir todo lo faltante" arriba.
- Editor de entrada: tabs por idioma, con marca `ai_generated` vs `human` y botón "Marcar como revisado".

### Fuera de alcance

- UI pública para que empresarios traduzcan su propio contenido (otra ola).
- Traducción de `alux_settings.personality_extra` (usar mismo patrón después).

### Riesgos

- **Costo del backfill**: N entradas × 5 traducciones × (1 llamada chat + 1 embedding). Con las entradas actuales es asumible; documentar en Completion Report.
- **Calidad traducción IA**: por eso el flag `source` y el flujo "Marcar como revisado" — el Founder o un editor puede pulir manualmente las de mayor tráfico.

### DoD

- Migración aplicada + GRANTs.
- RPC devuelve resultados en el locale pedido con fallback funcional.
- Alux responde en francés a un query francés usando chunk francés (verificado con Playwright).
- Admin puede traducir masivamente desde `/cms/alux/knowledge`.
- Typecheck + build limpio.
- Demo Pack: 3 entradas traducidas a los 6 idiomas + capturas del admin + query de prueba en cada idioma.
