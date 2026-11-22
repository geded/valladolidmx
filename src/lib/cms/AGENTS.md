# CMS rules

- CMS list search: every CMS list searches as you type (2+ letters, debounced) through `accentInsensitiveOr` (`src/lib/cms/accent-search.ts`, PostgREST `imatch`), offers «Le falta» filters from `missing-content.ts`, and remembers search/filters/page per tab via `useCmsListMemory` (`list-memory.ts`, sessionStorage). Why: editors find records without Enter or accents and return from the editor to the list as they left it, without a schema change.
