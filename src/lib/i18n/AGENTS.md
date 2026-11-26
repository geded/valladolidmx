# Translation rules

- Public pages translate through the runtime DOM translator (`ui-auto-translate.ts`, parallel batches) over `ui_translation_cache`; CMS saves (`translate-content.server.ts`) also seed that cache with their editorial translations so visitors get them instantly. Prompts ask for editorial tourism writing, never word-for-word. Why: public readers do not read the `translations` table, and sequential batches left pages in Spanish for minutes.
- Runtime translation reads cache without a quota; only uncached batches pass the shared atomic public quota before AI, with bounded batch count and total characters. Why: cached pages stay instant while automated callers cannot turn new wording into unbounded provider cost.
