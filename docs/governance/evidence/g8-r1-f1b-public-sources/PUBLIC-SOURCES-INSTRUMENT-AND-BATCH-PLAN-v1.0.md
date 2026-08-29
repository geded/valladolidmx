# G8-R1-F1B-PUBLIC-SOURCES · Instrumento de Procedencia y Plan de Lote Inicial (v1.0)

Modo: **READ-ONLY**. No se creó, modificó ni publicó ninguna entidad, medio, flag, redirect, sitemap ni composición.
Motivo del alto: la Autorización Founder ordena literalmente *"Si el modelo actual no permite procedencia campo por campo, detenerse y presentar el cambio aditivo mínimo necesario antes de implementarlo."* — **el modelo actual NO lo permite**.

---

## 1. Diagnóstico del modelo actual

Columnas hoy disponibles en `businesses` relacionadas con origen y confianza:

`status`, `verified`, `metadata (jsonb)`, `can_self_publish`, `is_demo_seed`, `demo_seed_batch`, `demo_source_url`, `verification_document_url`, `verification_notes`, `review_notes`, `submitted_for_review_at`.

| Requisito del Addendum | Estado | Evidencia |
| --- | --- | --- |
| Estado `unclaimed` explícito | **AUSENTE** | no existe columna de estado de reclamación; sólo `verified boolean` |
| Origen `public_source` | **PARCIAL/INADECUADO** | sólo `demo_source_url`, semánticamente reservado a datos demo |
| Procedencia **campo por campo** (URL, titular, fecha de consulta, evidencia, responsable, confianza, próxima revisión) | **AUSENTE** | no hay tabla ni jsonb contractual por campo |
| Caducidad de campos volátiles (horarios/servicios) | **AUSENTE** | `business_hours` no tiene `verified_at` ni `expires_at` |
| `noindex` hasta revisión editorial por ficha | **AUSENTE** en `businesses` (existe en `seo_metadata`/composiciones, no por entidad no reclamada) |
| Reclamación | **PRESENTE** | `claim_business`, `approve_ownership_claim`, `business_users`, `business_ownership_transfers` |
| Snapshot previo al reclamo | **AUSENTE** | no hay tabla de snapshot de ficha |

Conclusión: la reclamación existe y se reutiliza; **la procedencia y el estado no reclamado deben instrumentarse antes de crear una sola ficha real**.

---

## 2. Cambio aditivo mínimo propuesto (pendiente de autorización Founder)

Sólo aditivo. Cero cambios destructivos, cero renombres, cero alteraciones de RLS existentes.

1. `public.entity_field_provenance` (nueva tabla, autoridad única de procedencia):
   `id`, `entity_kind` (enum existente), `entity_id`, `field_path` (p. ej. `business.phone`, `business_hours.mon`),
   `source_url`, `source_holder`, `source_kind` (`official_site|official_social|tourism_registry|chamber|press_release|owner_provided|licensed_editorial`),
   `consulted_at`, `evidence_ref`, `captured_by`, `confidence` (`high|medium|low`), `next_review_at`, `created_at`.
   GRANT: `SELECT` a `authenticated`; `ALL` a `service_role`; sin acceso `anon`. RLS: lectura sólo staff editorial y dueños del negocio.
2. `businesses` (columnas aditivas):
   `claim_state text not null default 'unclaimed'` (`unclaimed|claim_pending|claimed|verified`),
   `origin text not null default 'internal'` (`internal|public_source|owner_provided`),
   `last_verified_at timestamptz`, `noindex boolean not null default true`.
3. `business_hours` (aditivo): `verified_at timestamptz`, `expires_at timestamptz`.
4. `public.business_claim_snapshots` (nueva): `business_id`, `snapshot jsonb`, `taken_at`, `reason` — se escribe automáticamente al aceptar un reclamo.
5. Regla fail-closed en la capa de lectura pública: `origin='public_source' AND claim_state<>'verified'` ⇒ nunca badge de verificación, nunca venta directa, nunca disponibilidad, `noindex=true`.

No se propone tabla nueva para casas de vacaciones: se modelan como `businesses` con categoría `casa-de-vacaciones`, cumpliendo Single Source of Truth Policy.

---

## 3. Superficie de ficha no reclamada (pendiente, sin implementar)

Bloques a añadir en la ficha cuando `claim_state='unclaimed'`:
"Reclamar esta empresa" → `claim_business`; "Reportar información incorrecta"; "Última verificación: {last_verified_at}"; "Fuente pública: {source_holder}"; aviso *"Esta empresa aún no administra su ficha en Valladolid.mx"*.

---

## 4. Línea base de deduplicación (estado real hoy)

Destinos del piloto: `valladolid` (published), `tinum` (**draft**), `temozon` (**draft**). Izamal excluido del lote por instrucción.

Empresas existentes en Valladolid (18): `bici-nocturna-calzada-frailes`, `bici-tours-valladolid`, `casa-colonial-sisal`, `casa-hipil-boutique`, `cenote-suytun`, `cenote-suytun-tour`, `cocina-de-dona-elsa`, `cocina-del-frailes`, `conato-1910`, `coqui-coqui-valladolid`, `hacienda-san-servacio-boutique`, `hacienda-selva-maya`, `hotel` (registro basura), `hotel-casa-tia-micha`, `ruta-cenotes-y-selva`, `taberna-de-los-frailes`, `yerbabuena-del-sisal`, `zazil-tunich`.

**Tinum: 0 empresas. Temozón: 0 empresas.** Cupo real del lote inicial se concentrará ahí y en el cierre de brechas de Valladolid.

Riesgos de duplicado detectados de antemano: `cenote-suytun` (empresa) vs. lugar homónimo; `cocina-de-dona-elsa` vs. `cocina-del-frailes`; `hacienda-selva-maya` vs. `hacienda-san-servacio-boutique`. Cualquier candidato que empate por nombre normalizado, slug, teléfono, dominio o coordenada a <120 m ⇒ **no crear, enviar a revisión**.

Registro `hotel` (slug genérico, sin coordenadas, `draft`) queda marcado para depuración editorial, fuera del lote.

---

## 5. Plan del lote inicial (a ejecutar sólo tras autorización del instrumento)

Cupos máximos, todos en `draft` + `unclaimed` + `noindex`:
hoteles ≤10 · restaurantes ≤10 · casas de vacaciones ≤10 · operadores/comercios/servicios ≤10 · lugares y atractivos ya definidos en el piloto.

Orden de carga: (1) Valladolid hoteles y restaurantes, (2) operadores y atractivos, (3) Tinum, (4) Temozón, (5) casas de vacaciones (requieren evidencia de operación real y contacto comercial propio).

Por candidato se registrará: nombre comercial, categoría, destino/zona, dirección comercial, coordenadas de fuente autorizada, teléfono/WhatsApp comercial, sitio oficial, redes oficiales, descripción original redactada a partir de hechos, servicios declarados, horarios con fecha de comprobación, enlace oficial de reservación, operador, accesibilidad e idiomas sólo si están declarados — **cada campo con su fila de procedencia**.

Medios: ningún import automático. Marcador neutral por defecto; fotografías sólo del propietario, propias de Valladolid.mx o con licencia acreditada. Nunca una fotografía de otra entidad.

Fuentes prohibidas confirmadas en el plan: scraping de Google Maps y de OTA (Airbnb/Booking/Expedia), fotos de terceros, reseñas o textos copiados, precios/disponibilidad dinámica, teléfonos personales, datos inferidos. Google Maps se usará únicamente para renderizar mapas conforme a su licencia. Airbnb sólo como enlace externo provisto por el anfitrión.

---

## 6. Entregables pendientes tras autorización

Candidatos con fuentes por campo · duplicados descartados · fichas draft creadas · campos faltantes · medios requeridos · estado de reclamación · revisión legal por fuente · manifiesto de publicación posterior.

## STOP CONDITION

Respetada. No se publicó nada, no se activó ningún flag, no se copió contenido protegido, no se crearon reservas ni Release Candidate. Se espera la autorización Founder del **cambio aditivo mínimo (sección 2)** antes de iniciar la captura del lote.
