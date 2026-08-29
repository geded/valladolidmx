# G8-R1-F1B-B2 · Revisión editorial del primer lote — Report v1.0

Autoridad: Autorización Founder G8-R1-F1B-B2.
Alcance ejecutado: revisión, completado editorial, SEO en borrador, clasificación geo, política de horarios y solicitud de medios de las 15 fichas de G8-R1-F1B-B1.
Estado final: **15/15 en `draft` / `in_review`**, `verified=false`, `can_self_publish=false`, `published_at=null`, `robots=noindex,nofollow`, sin sitemap, sin redirects, sin reclamaciones.

---

## 1. Inventario exacto (15)

| # | ID | Nombre | Familia | Destino / zona | Fuente oficial | Estado | Completitud |
|---|---|---|---|---|---|---|---|
| 1 | a5560322-2c40-4979-ab81-41cb7853ba8d | Lemuuch Hotel Boutique | Hospedaje · hotel | Valladolid / Centro | lemuuchhotel.com | draft·in_review | 60% |
| 2 | 11852a20-0c81-4bf1-94bb-a999d4b0374f | Casa Quetzal Hotel Boutique | Hospedaje · hotel | Valladolid / Sisal | casa-quetzal.com | draft·in_review | 65% |
| 3 | d08769b1-66b2-4c05-b794-cc446cebc545 | Hotel Quinta Marciala | Hospedaje · hotel | Valladolid / s/z | hotelquintamarciala.com.mx | draft·in_review | 45% |
| 4 | 30d8519d-2aaf-4123-bcc7-c915ad059d0d | Hotel Bernardino | Hospedaje · hotel | Valladolid / Sisal | hotelbernardino.mx | draft·in_review | 55% |
| 5 | ef85d2b3-6814-4761-a922-8224930de29e | Hotel Zenti'k Project | Hospedaje · hotel | Valladolid / s/z | hotelzentik.com | draft·in_review | 50% |
| 6 | a25bf2a6-74af-4c9b-a12e-bbe940987a21 | Hotel Olbil | Hospedaje · hotel | Valladolid / Santa Ana | olbilhotel.com | draft·in_review | 55% |
| 7 | cdf406bf-d8a2-4183-ac23-500dd31635ed | Sutuk Hotel | Hospedaje · hotel | Valladolid / Centro | sutuk.mx | draft·in_review | 65% |
| 8 | 972705a0-7b1b-4a8d-9b3f-f84a283f7f6e | Hotel Chichén Itzá | Hospedaje · hotel | Tinum / Pisté | mayaland.com | draft·in_review | 60% |
| 9 | 725c3f85-f838-42d7-b28e-bf814cfcf7a5 | El Sazón de Valladolid | Restaurante | Valladolid / Bacalar | sazondevalladolid.com | draft·in_review | 60% |
| 10 | *(ix-cat-ik)* restaurante-ix-cat-ik | Restaurante Ix Cat Ik | Restaurante | Valladolid / s/z | ixcatik.mx | draft·in_review | 30% |
| 11 | 2bd7d8d5-ad6b-443f-9f26-e14821fb0e46 | Paladar de Cura | Restaurante | Valladolid / Sisal | paladardecura.com.mx | draft·in_review | 55% |
| 12 | *(sikil)* sikil-restaurante | Sikil Restaurante | Restaurante | Valladolid / San Juan | sikil.mx | draft·in_review | 60% |
| 13 | dd796421-b7fa-43aa-9806-463bdc85a653 | Valladolid Expeditions | Operador | Valladolid / Sisal | valladolidexpeditions.mx | draft·in_review | 65% |
| 14 | 05b35bc4-5604-45c0-b383-146ab84fd1cd | Mayan World Tours | Operador | Valladolid / s/z | mayanworldtours.com | draft·in_review | 55% |
| 15 | 8289c7fe-2186-4efe-be06-6487bf69b627 | Sagrado Valladolid | Operador · bienestar | Valladolid / s/z | sagradovalladolid.com | draft·in_review | 45% |

Completitud = (nombre, descripción editorial, domicilio, teléfono, correo, redes, horario, coordenadas, portada, SEO) sobre 10 criterios.

**Desglose de los 8 hospedajes**
- hotel: **8** (los ocho se presentan como hotel / hotel boutique en su sitio oficial).
- hospedaje genérico: 0 · casa de vacaciones: **0** · otro: 0.

**Los 3 operadores**: Valladolid Expeditions, Mayan World Tours, Sagrado Valladolid.
**Los 4 restaurantes**: El Sazón de Valladolid, Restaurante Ix Cat Ik, Paladar de Cura, Sikil Restaurante.
**Duplicados reconciliados**: 0. **Registros nuevos**: 15. Verificado: 0 nombres duplicados en toda la tabla `businesses`.

---

## 2. Revisión de procedencia

85 registros de procedencia activos (`entity_field_provenance`, `superseded_at IS NULL`), todos con:
- fuente oficial del titular (`source_kind='official_site'`), URL https;
- fecha de consulta y captura (`observed_at`, `captured_at` = 2026-08-29);
- vigencia: `verification_due_at` = +180 días desde el alta;
- titular = razón comercial publicada en el propio sitio;
- nivel de confianza `source_checked` (no verificado por el operador);
- correspondencia entidad↔fuente revisada uno a uno (dominio propio del establecimiento).

**Rechazado o no capturado por regla:**
- Precios y tarifas: no capturados (no verificables ni estables).
- Horarios: 0 fichas; ninguna fuente publica horario con vigencia. No se infiere.
- Estrellas, premios, rankings y reconocimientos: no capturados (sin fuente acreditable).
- Afirmaciones promocionales ("el mejor", "único"): eliminadas del texto editorial.
- Teléfonos: se conservaron sólo los publicados como contacto comercial en la propia web. Se descartaron cadenas numéricas de scripts/analytics detectadas en el scrape (no son teléfonos).
- Servicios no confirmados (alberca, spa, transporte, desayuno): no afirmados.
- Domicilio: 5 fichas sin domicilio publicado → campo vacío, no inferido (Quinta Marciala, Zenti'k, Ix Cat Ik, Mayan World Tours, Sagrado).

Historial: la procedencia es inmutable por campo (`efp_one_active_per_field`); toda corrección futura crea una fila nueva y marca `superseded_at`. Snapshot previo a reclamación garantizado por `business_claim_snapshots`.

---

## 3. Descripción editorial original

Las 15 fichas recibieron, en `businesses.tagline`, `businesses.description` y `metadata.editorial`:
descripción corta, descripción principal, resumen territorial, diferenciadores acreditados y recomendación práctica.

Reglas aplicadas y verificadas: texto 100% original redactado a partir de hechos; cero copia extensa; cero superlativos; cero promesas de disponibilidad; ubicación territorial visible en todas; ninguna afirma relación comercial con Valladolid.mx. Se corrigió la acentuación de nombres propios (Hotel Chichén Itzá, El Sazón de Valladolid).

---

## 4. SEO en borrador (`metadata.seo_draft`)

Por ficha: `title`, `meta description`, `canonical_proposed` (`/oriente-maya/{destino}/{categoria}/{slug}` según Navigation Blueprint), `robots=noindex,nofollow`, Open Graph textual (sin imagen), tipo JSON-LD, campos JSON-LD permitidos, breadcrumb territorial y enlaces internos propuestos (destino y categoría). `in_sitemap=false` en las 15.

- 0 títulos duplicados (verificado en consulta).
- 0 canibalización: un canonical único por ficha, categoría correcta.
- JSON-LD: `Hotel` ×8, `Restaurant` ×4, `TravelAgency` ×2, `LocalBusiness` ×1 (Sagrado: bienestar, no agencia). **Ningún `VacationRental`**, porque no hay casas de vacaciones en el lote.
- JSON-LD sólo declara datos acreditados; dirección y teléfono se emitirán al publicar y sólo cuando existan.
- No se escribió nada en `seo_metadata` (4 filas históricas intactas): el SEO permanece en borrador dentro de la ficha.

---

## 5. Geolocalización

Clasificación en `metadata.geo_classification`: **15/15 = `pendiente`**.
- Coordenadas del operador: 0 · publicadas con permiso: 0 · registro público permitido: 0 · geocodificación con licencia de almacenamiento: 0.
- Cero scraping de coordenadas y cero extracción de Google Maps (regla respetada).
- Verificado en base: 0 filas con `latitude`/`longitude`, por tanto 0 coordenadas 0,0 y 0 herencia de otra empresa.
- `blocks_publication=true` en las 15 (Geolocation Mandatory Rule).

Vía autorizada al reanudar: coordenadas entregadas por el operador al reclamar, o geocodificación con proveedor de licencia compatible registrando proveedor, licencia, fecha, precisión, método, dirección utilizada y confianza. Sólo aplicable a las 10 fichas con domicilio.

---

## 6. Horarios y contacto

`metadata.hours_policy` en las 15: `has_verified_hours=false`, `valid_until=null`, `display_fallback="Consulta horario con el establecimiento"`, `never_show_open_now=true`. Ninguna fuente publica horario con vigencia; no se infirió ninguna hora.

Contacto acreditado: 15 sitios oficiales, 11 teléfonos, 11 correos, 9 perfiles sociales oficiales (Facebook/Instagram), 10 domicilios. Enlace de reservación propio: sólo Quinta Marciala (WhatsApp publicado en su web) — se registra como teléfono, no como motor de reserva.

---

## 7. Medios

Marcador neutral conservado en las 15 (ninguna portada). Solicitud de medios creada por ficha (`metadata.media_request`): portada horizontal (obligatoria), galería mínima 4, foto vertical móvil recomendada, autor, licencia, crédito, ALT y punto focal en blanco. Fuentes de descarga prohibidas: Google, OTA, redes sociales y el propio sitio oficial sin autorización expresa del titular.

- **Podrían aprobarse con marcador neutral** (grupo A): las 4 fichas de restaurante y las 3 de operador — su valor inicial es informativo y territorial.
- **Requieren obligatoriamente portada** para conservar la calidad premium: los **8 hospedajes**; una ficha de hotel sin imagen no sostiene la decisión de reserva.

---

## 8. Casas de vacaciones

**Ninguno de los 8 hospedajes pertenece a esta familia.** Los ocho se declaran hotel u hotel boutique en su fuente oficial; no hay renta íntegra de vivienda, capacidad por unidad, cocina equipada ni políticas de estancia publicadas. En consecuencia:
- no se autoasigna la plantilla pendiente;
- no se registran campos diferenciales (capacidad, habitaciones, cocina/servicios, políticas, disponibilidad) porque no hay fuente;
- el JSON-LD se mantiene `Hotel`, nunca `VacationRental`;
- la familia queda **bloqueada** hasta decisión Founder y hasta que exista una ficha real que la justifique.

---

## 9. Operadores y lugares

| Operador | ¿Administra un lugar? | ¿Vende productos? | Relación propuesta |
|---|---|---|---|
| Valladolid Expeditions | No acreditado | Sí, recorridos propios | Empresa (operador) → Productos/tours pendientes de captura. Sin autoridad sobre cenotes ni zonas arqueológicas. |
| Mayan World Tours | No acreditado | Sí, tours regionales | Empresa (operador) → Productos/tours pendientes. Sin autoridad sobre Chichén Itzá ni otros atractivos. |
| Sagrado Valladolid | Posible espacio propio, **no publicado** | Sí, sesiones/experiencias | Empresa (bienestar) → Producto experiencia. No se crea Lugar hasta confirmar domicilio. |

Separación respetada: Empresa = operador, Lugar = atractivo, Producto = oferta. No se convirtió ningún operador en propietario de un atractivo; no se aprobó ninguna reclamación ni autoridad (`place_authorities` sin cambios).

---

## 10. Vista de revisión (QA responsive)

**PENDIENTE — no ejecutable en este alcance.** Las 15 fichas están en `draft`; ninguna superficie pública las renderiza (RLS y el resolutor canónico filtran no publicadas), y la Autorización B2 no permite tocar código para crear una vista staff de previsualización. Se declara como brecha, no como PASS.

Lista de verificación acordada para cuando se autorice la vista staff/noindex en 390 / 768 / 1440 px: nombre, territorio, descripción, contacto, marcador neutral, procedencia, reclamación discreta, Alux, Guardar, Agregar a Mi Viaje, un solo header/footer, overflow 0, consola limpia.

---

## 11. Clasificación final

**A · Lista para aprobación editorial con marcador neutral (7)**
El Sazón de Valladolid · Paladar de Cura · Sikil Restaurante · Valladolid Expeditions · Mayan World Tours · Sagrado Valladolid · Restaurante Ix Cat Ik *(condicionada: sin domicilio ni teléfono, aprobar sólo como ficha mínima)*.

**B · Lista para aprobación cuando reciba fotografía (5)**
Lemuuch Hotel Boutique · Casa Quetzal Hotel Boutique · Hotel Bernardino · Hotel Olbil · Sutuk Hotel *(datos suficientes; falta portada y coordenadas)*.

**C · Requiere información del operador (3)**
Hotel Quinta Marciala *(sin domicilio)* · Hotel Zenti'k Project *(sin domicilio)* · Hotel Chichén Itzá *(domicilio a nivel localidad; requiere calle y confirmación del operador Mayaland)*.

**D · Rechazada o duplicada (0)** — los rechazos del lote se resolvieron antes del alta (ver Batch Report B1).

Nota transversal: ninguna ficha del grupo A o B puede publicarse mientras `geo_classification=pendiente`.

---

## 12. Gates

| Gate | Resultado |
|---|---|
| Procedencia (85 filas activas, fuente/fecha/vigencia/titular/confianza) | PASS |
| Deduplicación (0 nombres duplicados, 0 slugs colisionados) | PASS |
| Vigencia (`verification_due_at` +180 d en 15/15) | PASS |
| Geolocalización (0 coordenadas, 0 herencias, 0 puntos 0,0) | PASS con bloqueo declarado |
| SEO/JSON-LD (0 títulos duplicados, tipo correcto por familia) | PASS |
| noindex (15/15 `noindex,nofollow`, 0 en sitemap, `seo_metadata` sin cambios) | PASS |
| RLS / flags (`verified`, `can_self_publish`, `published_at` = 0 alteraciones) | PASS |
| G8-M1 · Q2/R1 · gobernanza (`governance:check`, `validate:r1:f1b:s1`) | PASS |
| lint / typecheck / build | N/A — no se tocó código |
| QA responsive 390/768/1440 | PENDIENTE (§10) |

---

## 13. STOP CONDITION

Revisión entregada. Las 15 fichas permanecen en `draft` / `in_review`, flag en false, cero publicación, cero sitemap, cero redirects, cero reclamaciones. No se inicia ninguna ola posterior sin autorización del Founder.

Rollback editorial: `UPDATE public.businesses SET metadata = metadata - 'editorial' - 'seo_draft' - 'media_request' - 'geo_classification' - 'hours_policy' WHERE metadata->>'batch'='G8-R1-F1B-B1';`
