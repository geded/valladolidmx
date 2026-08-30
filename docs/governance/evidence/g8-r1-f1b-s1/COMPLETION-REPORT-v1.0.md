# G8-R1-F1B-S1 · Modelo de Procedencia y Reclamación de Fichas Públicas — Completion Report v1.0

Alcance ejecutado: **sólo el modelo**. Cero fichas creadas, cero publicación, cero backfill,
cero medios, cero flags, cero sitemap/redirects, cero PR/merge/despliegue.

Base: HEAD acreditado de R1-F1A · instrumento
`docs/governance/evidence/g8-r1-f1b-public-sources/PUBLIC-SOURCES-INSTRUMENT-AND-BATCH-PLAN-v1.0.md`.

---

## 1. Esquema final

### 1.1 `public.entity_field_provenance` (nueva · append-only)

| Campo | Tipo | Semántica |
| --- | --- | --- |
| `id` | uuid PK | Identidad de la fila de procedencia |
| `entity_type` | text CHECK | Allowlist cerrada: `business, place, product, event, destination` |
| `entity_id` | uuid | Entidad referida; existencia validada por trigger (cero huérfanas) |
| `field_path` | text CHECK regex | `entidad.campo` en snake_case (`business.contact_phone`) |
| `source_url` | text CHECK | Sólo HTTPS |
| `source_owner` | text | Titular de la fuente |
| `source_kind` | text CHECK | `official_site, official_social, tourism_registry, chamber, press_release, owner_provided, licensed_editorial` |
| `observed_at` | timestamptz | Fecha del hecho observado en la fuente |
| `captured_at` | timestamptz | Fecha de captura |
| `verification_level` | text CHECK | `unverified, source_checked, editorially_verified, owner_confirmed` |
| `evidence_checksum` | text CHECK SHA-256 | Huella mínima suficiente; **nunca copia de la página** |
| `evidence_ref` | text | Referencia inmutable interna |
| `created_by` | uuid | Responsable de la captura |
| `superseded_at` / `superseded_by` | timestamptz / uuid FK | Historial, no sobrescritura |
| `metadata` | jsonb (≤2 KB) | Estrictamente acotado |

Invariantes: índice único parcial `efp_one_active_per_field` (una procedencia activa por campo);
trigger `efp_assert_entity_exists` (existencia); trigger `efp_history_guard` (append-only: una fila
superseded es inmutable y jamás cambia entidad, campo, URL u `observed_at`).

### 1.2 `public.businesses` (aditivo)

`record_origin` (`owner_submitted|public_source|editorial|imported|demo`, default `owner_submitted`),
`source_review_state` (`unreviewed|in_review|approved|stale|rejected`, default `unreviewed`),
`last_verified_at`, `verification_due_at`. **Texto + CHECK**, no enum PostgreSQL (reversible).

`verified` (booleano histórico) conserva su semántica: **insignia editorial de confianza**. No
significa reclamado por propietario ni fuente vigente; así quedó documentado en `COMMENT ON COLUMN`.
Reclamación ⇒ derivada. Vigencia ⇒ `last_verified_at`/`verification_due_at`.

Reconciliación `demo_seed` ⇄ `record_origin='demo'`: **documental**, sin actualizar filas históricas
(`expectedRecordOriginForLegacy`). Verificado: 0 filas con `record_origin` distinto del default.

### 1.3 `public.business_hours` (aditivo)

`source_verified_at`, `valid_until`. Resolutor `hoursValidity()`:
`current` · `pending_confirmation` · `expired`. Un horario vencido nunca se presenta como vigente;
reclamar una empresa no convierte horarios antiguos en verificados (los campos no se tocan).

### 1.4 `public.business_claim_snapshots` (nueva · inmutable)

`id, claim_id → business_ownership_transfers, business_id, snapshot jsonb, snapshot_hash (SHA-256),
snapshot_version, reason (allowlist), actor_user_id, audit_ref, created_at`.
Trigger `bcs_immutable_guard` bloquea **UPDATE y DELETE**. El snapshot excluye
`verification_notes`, `review_notes` y `verification_document_url` (cero secretos/notas internas).
No sustituye `content_audit_log`: cada snapshot escribe además `claim.snapshot.created` en el log.

### 1.5 Autoridad SEO

No se creó columna `noindex` ni `robots_directive` nueva. La única autoridad SEO sigue siendo
`seo_metadata.noindex`. Toda futura ficha de fuente pública nacerá `draft` +
`source_review_state='unreviewed'` + `seo_metadata.noindex=true`, sin badge y sin auto-publicación.

---

## 2. Matriz RLS / ACL (verificada empíricamente)

| Tabla / función | anon | authenticated (viewer ajeno) | owner/manager/editor de la ficha | editor/admin (`poi.write`) | service_role |
| --- | --- | --- | --- | --- | --- |
| `entity_field_provenance` SELECT | **denegado 401** (`REVOKE ALL`) | denegado (RLS) | permitido (sólo su entidad) | permitido | permitido |
| `entity_field_provenance` INSERT/UPDATE | **denegado 401** | denegado | denegado | permitido (`created_by = auth.uid()`) | permitido |
| `entity_field_provenance` DELETE | denegado | denegado (sin policy) | denegado | denegado | permitido |
| `business_claim_snapshots` SELECT | **denegado 401** | denegado | sólo el reclamante del propio `claim_id` | admin | permitido |
| `business_claim_snapshots` INSERT | denegado | denegado | denegado | admin (`actor_user_id = auth.uid()`) | permitido |
| `business_claim_snapshots` UPDATE/DELETE | **imposible** (trigger `claim_snapshot_is_immutable`) | imposible | imposible | imposible | imposible |
| `resolve_business_claim_state()` | EXECUTE (sólo devuelve estado) | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| `business_public_source_summary()` | EXECUTE (proyección segura) | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| `create_business_claim_snapshot()` | **revocado** | falla `forbidden` | falla `forbidden` | admin | permitido |

Evidencia empírica (clave publicable, REST):

```
GET  /rest/v1/entity_field_provenance   → 401 permission denied for table entity_field_provenance
GET  /rest/v1/business_claim_snapshots  → 401 permission denied for table business_claim_snapshots
POST /rest/v1/entity_field_provenance   → 401 permission denied
POST /rest/v1/rpc/business_public_source_summary → 200 (null para id inexistente)
```

`service_role` no se expone al cliente: ninguna ruta ni `.functions.ts` importa el cliente admin.

---

## 3. Contratos y funciones server-side

`src/lib/provenance/provenance-contracts.ts` (capa pura, Zod):
allowlists · `recordFieldProvenanceSchema` · `supersedeFieldProvenanceSchema` ·
`listEntityProvenanceSchema` · `setBusinessSourceReviewSchema` · `setBusinessHoursValiditySchema` ·
`createClaimSnapshotSchema` · resolutores `resolveClaimState`, `hoursValidity`, `canBePublic`,
`toPublicSourceSummary`, `expectedRecordOriginForLegacy`.

`src/lib/provenance/provenance.functions.ts` (todas con `requireSupabaseAuth`, salvo el resumen
público que usa la clave publicable):
`recordFieldProvenance` · `supersedeFieldProvenance` · `listEntityProvenance` ·
`setBusinessSourceReview` · `setBusinessHoursValidity` · `resolveBusinessClaimState` ·
`createBusinessClaimSnapshot` · `getBusinessPublicSourceSummary`.

**No se creó importador masivo ni alta pública.** Gate estático verifica ausencia de
`from("businesses").insert` en el módulo.

---

## 4. Resolutor de reclamación (estado derivado, nunca almacenado)

`public.resolve_business_claim_state(uuid)` y su espejo puro `resolveClaimState()` devuelven
`unclaimed | claim_pending | claimed | claim_revoked`, derivados exclusivamente de
`business_users` (owner activo) y `business_ownership_transfers` (pendiente vigente / rechazado /
cancelado / owner suspendido o removido). `claim_disputed` **no se implementa**: el modelo actual
permite una sola reclamación pendiente por empresa (`claim_already_pending`), por lo que no existe
disputa representable — se declara fuera de alcance en lugar de simularse.

Reglas acreditadas por prueba: vender un producto o ser `manager`/`editor` **no** acredita
propiedad; el claim vencido no acredita nada; la aprobación administrativa es la única vía a
`claimed`; la revocación es efectiva; un solo owner activo por empresa (invariante preexistente).
Cero divergencia SQL ⇄ TypeScript: misma tabla de decisión y mismo orden de precedencia.

---

## 5. Lectura pública fail-closed

`canBePublic()` exige: `published` · `deleted_at IS NULL` · `source_review_state='approved'` ·
ruta canónica · destino · coordenadas · fuente vigente · SEO revisado · campos editoriales mínimos.
Una ficha aprobada puede seguir siendo **no reclamada**: reclamación y aprobación editorial son
conceptos distintos.

Superficie pública permitida: “Información recopilada de fuentes públicas”, fecha de última
verificación, “Reclamar esta empresa”, “Reportar información incorrecta”.
Prohibido y ausente de la proyección: notas internas, hashes, IDs de procedencia, evidencia,
historial técnico.

---

## 6. Registro basura `hotel`

No borrado ni modificado en esta fase (instrucción). Auditoría y recomendación de cuarentena
reversible: `docs/governance/evidence/g8-r1-f1b-s1/JUNK-RECORD-HOTEL-AUDIT-v1.0.md`.

---

## 7. Migración, rollback e idempotencia

Migraciones aplicadas: `20260829083223` (modelo) y `20260829083941` (ACL fail-closed).
UP + DOWN consolidados en `MIGRATION-UP-DOWN-v1.0.sql`.

- Aditiva: ningún DROP/RENAME/ALTER destructivo sobre objetos existentes.
- Idempotente: `IF NOT EXISTS` en tablas/columnas/índices, `DROP TRIGGER IF EXISTS` + `CREATE`,
  `CREATE OR REPLACE FUNCTION`, constraints guardados por `DO $$ ... pg_constraint ... $$`.
- Reversible: bloque ROLLBACK (DOWN) documentado, sin pérdida de datos preexistentes.
- Tipos canónicos regenerados (`src/integrations/supabase/types.ts` incluye ambas tablas y las
  cuatro columnas nuevas de `businesses`).

Prueba de no mutación de datos existentes:

```
entity_field_provenance = 0 filas
business_claim_snapshots = 0 filas
businesses con record_origin <> default = 0
```

Sin `INSERT`/`UPDATE` de negocios, horarios o procedencias en la migración (verificado por gate).

---

## 8. Gates

`bun run validate:r1:f1b:s1` encadena:
`test:r1:f1b:s1` (31 escenarios) · `lint` · `typecheck` · `test:q2a` · `test:q2b` · `test:r1:a` ·
`route-inventory-coverage` · `governance:check`.

Cobertura de escenarios: fuente por campo · supersesión · URL inválida · entidad inexistente ·
acceso anónimo denegado · empresa ajena denegada · editor permitido · horario vigente/vencido/
pendiente · draft noindex · fuente sin revisar no pública · ficha aprobada no reclamada ·
claim pendiente/aprobado/revocado/vencido · snapshot inmutable · rollback documentado ·
cero divergencia claim derivado ⇄ claims reales · compatibilidad con registros existentes ·
cero backfill · ausencia de importador masivo · una sola autoridad SEO.

---

## 9. Confirmación final

- **0** fichas creadas, **0** publicadas, **0** medios importados.
- **0** cambios de estado turístico, flags, sitemap, redirects o composiciones.
- **0** filas históricas reinterpretadas.
- Flag de captura: inexistente/false — el lote **no** se inició.

STOP CONDITION respetada: el modelo queda cerrado; R1-F1B de datos no comienza.
