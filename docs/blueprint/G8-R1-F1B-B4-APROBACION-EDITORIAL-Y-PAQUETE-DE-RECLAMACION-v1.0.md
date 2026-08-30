# G8-R1-F1B-B4 · Aprobación editorial interna y paquete de reclamación · v1.0

Estado: `Approved` · Dominio: `D04 · content-experience` · Autorización: `PCA-2026-054`
Antecedente: `docs/blueprint/G8-R1-F1B-B3-GEOLOCALIZACION-ACREDITADA-Y-PREVIEW-INTERNO-v1.0.md`

## 1 · Alcance autorizado

Revisar y aprobar editorialmente, **sin publicar**, únicamente las fichas del lote B1-B3 que cumplen todos los mínimos acreditados; preparar el paquete de reclamación y la solicitud de medios de las 15 fichas; y dejar constancia reversible de cada transición.

No autoriza publicación, activación de flags, sitemap, redirects, contacto automático con empresas, importación de fotografías de terceros, PR, merge ni despliegue.

## 2 · Decisiones

- **Grupo A (3):** El Sazón de Valladolid, Sikil Restaurante, Valladolid Expeditions. Aprobadas y listas para Release Candidate con marcador neutral de imagen.
- **Grupo B (3):** Hotel Olbil, Lemuuch Hotel Boutique, Sutuk Hotel. Aprobadas editorialmente; bloqueadas para Release Candidate hasta recibir fotografía autorizada (portada obligatoria por estándar premium de hotelería).
- **Grupo C (9):** permanecen en `in_review` con solicitud concreta al operador y geolocalización `pending_manual_confirmation`. Prohibida la geocodificación automática y la aproximación al centro territorial.

## 3 · Modelo aplicado

- `businesses.source_review_state`: `in_review → approved` en las 6 fichas; `status` permanece `draft` en las 15.
- `businesses.metadata.editorial_approval`: sello con decisión, revisor, fecha, estado previo, mínimos verificados y banderas `publication: false`, `claim_state: 'unclaimed'`, `badge: false`, `direct_sale: false`, `robots: 'noindex,nofollow'`.
- `businesses.metadata.claim_package`: paquete interno de reclamación de las 15 fichas, con `contact_sent: false`.
- `businesses.metadata.media_request` v2: especificaciones de portada, galería, versión vertical, resolución, formatos, autoría, licencia, crédito, ALT, punto focal y autorización, con G8-M1 como única puerta de entrada.
- `businesses.metadata.operator_confirmation_request`: siete peticiones concretas para las 9 fichas pendientes.
- `content_audit_log`: una entrada por ficha con los datos de reversión.
- Invariante en la migración: aborta si cualquier ficha del lote deja de ser borrador.

## 4 · UX de reclamación discreta

Se conserva el contrato aprobado: único texto público «¿Representas a este establecimiento? Administra esta ficha», exclusivamente como enlace secundario al pie de la ficha, nunca en tarjetas ni compitiendo con CTA turísticos. «Establecimiento verificado» permanece apagado hasta acreditar al operador y aprobar administrativamente la relación.

## 5 · Gates

`bun run validate:r1:f1b:b4` — contrato ejecutable de 20 escenarios sobre el snapshot acreditado del lote, más `lint`, `typecheck`, cobertura de inventario de rutas y `governance:check`.

## 6 · Evidencia

- `docs/governance/evidence/g8-r1-f1b-b4/EDITORIAL-APPROVAL-AND-CLAIM-PACKAGE-v1.0.md`
- `docs/governance/evidence/g8-r1-f1b-b4/batch-state.snapshot.json`
- `scripts/omxds/r1-f1b-b4/editorial-approval.contract.test.ts`

## 7 · Veredicto

6 fichas aprobadas editorialmente (3 A + 3 B), 9 pendientes de operador, 0 publicadas, 0 reclamadas, 0 verificadas, flag OFF. **G8-R1-F1B-B4 · CERRADA Y ACREDITADA.**
