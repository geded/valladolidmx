# Roadmap

## En curso

- [x] Estandarización transversal del breadcrumb móvil (primitiva compartida `CompactCrumbs`, unificación `BreadcrumbTerritorial` + `PremiumTerritorialBreadcrumb`, activación en listados/perfiles/previews, eliminación de breadcrumb duplicado en destino).
- [ ] QA responsive 390/430/834/1440 de la estandarización del breadcrumb.
- [x] Lote 1 · Integridad técnica y contratos: auditoría y reparación de los 4 hallazgos rojos de `bun test scripts/` (1 fail + 3 errors) — todos clasificados como contrato obsoleto; suite 756/756, typecheck y build en verde.
- [x] Lote 2 · Auditoría autenticada y Matriz de Capacidades OMXDS (sólo lectura, sin reparación): informe en `docs/governance/audit/2026-09-04-LOTE-2-AUDITORIA-AUTENTICADA-Y-MATRIZ-OMXDS-v1.0.md`. UI autenticada NO VERIFICADA por falta de sesión de prueba (no hay usuarios `business_owner`/`concierge`); evidencia estática + consultas de sólo lectura a Lovable Cloud.
- [ ] Lote 3 en adelante: pendiente de autorización del Founder tras revisar los bloqueadores P0/P1/P2 del informe del Lote 2.
- [ ] Revisión de copy en Lote 3: "Oriente Maya" sin marca larga en las vistas previas de experiencia y evento (excepción documentada en el contrato G5).
