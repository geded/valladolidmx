# G8-Q2A-R1 · Resultado de gates

**Fecha:** 2026-08-28 · **Flag:** `omxds_visual_v1_contracts_enabled = false`

| Gate                             | Comando                                              | Resultado                                                                              |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Lint                             | `bun run lint`                                       | PASS — 0 deuda nueva; 33 archivos cambiados limpios                                    |
| Typecheck                        | `bun run typecheck`                                  | PASS — `tsc --noEmit` sin diagnósticos                                                 |
| Build                            | `bun run build`                                      | PASS — build de producción completo                                                    |
| Contratos Q2A                    | `bun run validate:q2a`                               | PASS — 8 pruebas, 28 aserciones                                                        |
| Contratos Q2A-R1                 | `bun run validate:q2a-r1`                            | PASS — 11 pruebas, 0 fallos                                                            |
| Matriz RLS empírica              | `rls-harness.mjs`, 8 sujetos                         | PASS — `rls-matrix-empirical.md`                                                       |
| ACL efectivo                     | `pg_class.relacl` posterior                          | PASS — `acl-effective.md`                                                              |
| No elusión de RLS por ACL amplio | clúster efímero                                      | PASS — rol con `GRANT ALL` sin política ve cero filas                                  |
| Idempotencia                     | clúster efímero                                      | PASS — R1 reaplicable; Q2A no-op seguro                                                |
| Rollback                         | clúster efímero                                      | PASS — R1 y Q2A revertibles sin pérdida de lugares                                     |
| Inmutabilidad de los cinco POI   | lectura no destructiva                               | PASS — 5 filas, 0 con `place_type_id`, `max(updated_at) = 2026-07-03T17:24:08Z`        |
| Linter de base de datos          | plataforma                                           | PASS relativo — 256 → 255 hallazgos; la única diferencia es `place_duplicate_warnings` |
| Proyecciones                     | `bun scripts/governance/sync-governance.mjs --check` | PASS — 0 proyecciones obsoletas                                                        |
| Integridad                       | `bun run governance:check`                           | PASS — 1851 artefactos, cobertura 96.87 %, 0 errores                                   |
| Autorización de producto         | `bun run governance:product-check`                   | PASS — 43 manifiestos                                                                  |
| Pruebas de autorización          | `bun run governance:product-test`                    | PASS                                                                                   |

## Invariantes acreditadas

- Cero contenido turístico real creado o modificado; cero filas nuevas de lugares.
- Cinco POI históricos intactos, con `place_type_id` nulo y `updated_at` original.
- `place_authorities` sin acceso anónimo; borradores invisibles para no staff.
- Ninguna escritura posible para `anon`, `traveler`, `business_owner` ni `concierge`.
- Sin elevación de privilegios, sin manipulación del historial protegido, sin rollback
  contra la base compartida, sin creación de usuarios ni cambios de rol en ella.
- Sin CMS, rutas públicas, plantillas, sitemap, redirects, publicación, PR, merge ni despliegue.
