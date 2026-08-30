# G8-Q2A · Resultado de gates

**Base:** `180df4ff15e6a4a3b689aa519996ad41c4bb6a06` · **Fecha:** 2026-08-28
**Flag:** `omxds_visual_v1_contracts_enabled = false`

| Gate                     | Comando                                              | Resultado                                                                   |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Lint                     | `bun run lint`                                       | PASS — sin nueva deuda; 33 archivos cambiados limpios                       |
| Typecheck                | `bun run typecheck`                                  | PASS — `tsc --noEmit` sin diagnósticos                                      |
| Build                    | `bun run build`                                      | PASS — build de producción completo                                         |
| Contratos Q2A            | `bun run validate:q2a`                               | PASS — 8 pruebas, 28 aserciones, 0 fallos                                   |
| Evidencia Q2A            | `places-model.evidence.mjs`                          | PASS — 15 tipos · 9 categorías · 6 autoridades · 0 filas históricas mutadas |
| Proyecciones             | `bun scripts/governance/sync-governance.mjs --check` | PASS                                                                        |
| Integridad               | `governance:check`                                   | PASS — 1846 artefactos, cobertura 96.86 %                                   |
| Autorización de producto | `governance:product-check`                           | PASS — 42 manifiestos                                                       |

## Invariantes acreditadas

- Cinco POI existentes sin mutación (`updated_at` original conservado).
- Cero filas nuevas de lugares; cero contenido turístico real creado o modificado.
- SEO gobernado por `seo_metadata`; sin columnas SEO nuevas en `points_of_interest`.
- `place_categories` sin relación con `business_categories`.
- RLS reconciliada: `points_of_interest` conserva exactamente `poi_public_read` y `poi_staff_write`.
- Funciones administrativas no ejecutables por `anon`.
- Sin CMS, rutas públicas, redirects, sitemap, plantillas, publicación, PR, merge ni despliegue.
