# G8-R1-F1G · Conversión del corpus demo en contenido real removible

**Estado:** DIAGNÓSTICO READ-ONLY · pendiente de aprobación Founder
**Fecha:** 2026-08-30 (UTC)
**Alcance:** 53 registros `is_demo_seed = true` publicados
**Cambios ejecutados:** ninguno (cero escrituras, cero migraciones, flag `omxds_visual_v1_contracts_enabled` = OFF)

---

## 1 · Autoridad interna del lote

Identificador interno propuesto: `G8-R1-F1G-EVALUATION-CONTENT`.

**Sin schema nuevo.** Se reutiliza infraestructura existente:

| Necesidad | Soporte existente |
|---|---|
| Pertenencia al lote | `demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'` (columna ya presente en `destinations`, `businesses`, `products`, `events`, `points_of_interest`) |
| Snapshot anterior / datos modificados / actor / fecha / estado previo | `content_audit_log` (472 filas hoy, contrato ya en uso) |
| Procedencia campo por campo + fuentes | `entity_field_provenance` (97 filas hoy) |
| Medios y elegibilidad de portada | `media_assets` + contrato G8-M1 |
| Presentación | `entity_presentation_modes` + historial |
| Ruta canónica / SEO | contrato de navegación `src/lib/navigation` + `seo_metadata` |
| Checksum + rollback | entrada de `content_audit_log` con `sha256` del snapshot previo |

`demo_seed_batch` **nunca** se serializa en superficies públicas (no aparece en adaptadores, JSON-LD, canonical, sitemap, tarjetas ni contexto de Alux); el control de fuga forma parte de los gates propuestos (§6).

---

## 2 · Matriz A/B/C/D/E de los 53 registros

Clave: **A** real verificable · **B** sustituible por entidad real equivalente · **C** no verificable → draft/despublicar · **D** evento vencido → archivar · **E** duplicado → reconciliar.

### 2.1 Destinos (6)

| Slug | Clase | Fundamento |
|---|---|---|
| izamal | A | Municipio y Pueblo Mágico real; cobertura obligatoria |
| espita | A | Municipio y Pueblo Mágico real; cobertura obligatoria |
| ek-balam | A | Localidad y zona arqueológica reales (Temozón) |
| rio-lagartos | A | Municipio real |
| las-coloradas | A | Localidad real (Río Lagartos) |
| uayma | A | Municipio real |

Los 6 son convertibles con datos oficiales (INEGI/SECTUR/ayuntamientos). Faltantes: `tourism_region_id` coherente, descripción editorial original y provenance campo por campo.

### 2.2 Empresas (23)

| Slug | Clase | Fundamento / acción |
|---|---|---|
| conato-1910 | A | Restaurante real, Valladolid |
| taberna-de-los-frailes | A | Restaurante real, barrio Sisal |
| yerbabuena-del-sisal | A | Restaurante real, Sisal |
| hotel-casa-tia-micha | A | Hotel real, Valladolid centro |
| coqui-coqui-valladolid | A | Casa/perfumería real, Calzada de los Frailes |
| kinich-restaurante | A | Restaurante real, Izamal |
| macan-che-bed-breakfast | A | Hospedaje real, Izamal |
| zazil-tunich | A | Parque/cenote real, Yalcobá (Valladolid) |
| cenote-suytun | E | Duplica el POI `cenote-suytun`; es lugar, no empresa. Reconciliar: conservar POI, retirar ficha de empresa o reasignarla al operador real |
| cenote-suytun-tour | C | Producto/tour sin operador acreditado |
| convento-san-antonio-tour | C | Tour ficticio; el convento es POI, no empresa |
| mercado-espita-tour | C | Tour ficticio |
| bici-nocturna-calzada-frailes | C | Ficticio (lote `alux-at4-demo`) |
| bici-tours-valladolid | B | Genérico; sustituible por operador de ciclismo real de Valladolid |
| calesa-izamal | B | El servicio de calesas existe; sustituible por unión/sitio real acreditado |
| casa-hipil-boutique | B | Ficticio; sustituible por hotel boutique real de Valladolid |
| casa-colonial-sisal | B | Ficticio (`demo-world-v1`); sustituible por casa de vacaciones real de Sisal |
| villa-amarilla-izamal | B | Ficticio (`demo-world-v1`); sustituible por casa de vacaciones real de Izamal |
| hotel-boutique-espita | C | Sin identidad acreditable en Espita |
| hotel-santo-domingo-izamal | C | Nombre no acreditable |
| los-almendros-espita | C | Marca real pero sin sucursal acreditable en Espita |
| artesanias-hunab-ku | B | Genérico; sustituible por taller artesanal real de Izamal |
| talleres-hipil-espita | B | Genérico; sustituible por taller de hipil real de Espita |

Resumen empresas: **A 8 · B 7 · C 7 · E 1**.

### 2.3 Productos (9)

| Slug | Clase | Fundamento / acción |
|---|---|---|
| nado-en-cenote (Zazil Tunich) | A | Experiencia real; convertir **sin** precio/horario/disponibilidad inventados |
| recorrido-cenote-museo (Zazil Tunich) | A | Ídem |
| ceremonia-maya (Zazil Tunich) | A | Ídem |
| cena-romantica-en-cenote (Zazil Tunich) | A | Ídem, verificar que siga ofertándose |
| tour-cenote-suytun-guiado-demo | C | Depende de empresa E/C |
| bici-nocturna-frailes-ticket-demo | C | Depende de empresa C |
| suite-selva-maya-demo | C | Empresa matriz ficticia |
| menu-cochinita-tradicional-demo | C | Empresa matriz ficticia |
| tour-manglar-amanecer-demo | B | Sustituible por operador real de Río Lagartos |

Los 4 productos A deben pasar a `conversion_mode = 'informacion'` o `solicitar_cotizacion`; **prohibido** `reservar_en_linea` y precio no acreditado.

### 2.4 Eventos (10) — fecha de control 2026-08-30

| Slug | Clase | Fundamento |
|---|---|---|
| luz-y-sonido-izamal (07-15) | D | Vencido |
| festival-vaqueria-valladolid-demo (07-17) | D | Vencido + ficticio |
| encuentro-hipil-espita (07-19) | D | Vencido |
| festival-sac-be-valladolid (07-23) | D | Vencido |
| feria-artesanias-izamal (07-30) | D | Vencido |
| noche-cochinita-valladolid (08-06) | D | Vencido |
| festival-queso-bola-espita (08-09) | D | Vencido |
| carrera-ruta-cenotes (08-22) | D | Vencido |
| noche-boleros-espita (08-24) | D | Vencido |
| hanal-pixan-izamal (09-03) | C+D | Vigente en calendario pero fecha fabricada (Hanal Pixán es finales de octubre); archivar |

**Los 10 se archivan.** Prohibido reescribir fechas. La familia Eventos queda en **estado vacío correcto** hasta acreditar convocatorias reales publicadas por ayuntamiento/SECTUR.

### 2.5 Lugares · POI (5)

| Slug | Clase | Fundamento / acción |
|---|---|---|
| cenote-zaci | A | Real, Valladolid |
| convento-san-bernardino | A | Real, Valladolid |
| calzada-de-los-frailes | A | Real, Valladolid |
| cenote-suytun | A+E | Real; reconciliar con la ficha de empresa homónima |
| cenote-ik-kil | A | Real, pero territorialmente pertenece a **Pisté/Tinum**, no a Valladolid: corregir `destination_id` |

### 2.6 Totales

| Clase | Total |
|---|---|
| A · convertible | 23 |
| B · sustituible | 8 |
| C · no verificable | 11 |
| D · evento vencido | 10 |
| E · duplicado (además de su clase) | 1 (`cenote-suytun`, doble registro empresa/POI) |

---

## 3 · Manifiesto exacto del lote

**Convertibles a real (A · 23):** 6 destinos, 8 empresas, 4 productos, 5 POI.
**Sustituciones propuestas (B · 8):** 7 empresas + 1 producto, todas de la misma familia y territorio, sujetas a fuente pública acreditada (sitio oficial del establecimiento, directorio SECTUR, registro municipal). Ninguna sustitución se ejecuta sin fuente citada por campo.
**A retirar (C · 11 + D · 10 = 21):** despublicar/archivar, conservando snapshot y auditoría; sin DELETE físico.
**Reconciliación (E · 1):** `cenote-suytun` empresa ↔ POI.

**Fotografía:** cero descargas de Google, Airbnb, redes u OTAs. Las 23 entidades A entran en **Editorial** con marcador neutral; Cinematográfica queda bloqueada hasta portada con derechos + ALT humano + 1600×900 (contrato G8-M1). Hoy sólo 3 empresas publicadas tienen portada acreditada y ninguna pertenece al corpus demo.

**Dependencias detectadas** (relevantes para el retiro): `travel_plan_items` 20 · `concierge_order_items` 3 · `business_users` 3 · `reviews` 12 · `traveler_favorites` 0 · `order_items` 0 · `business_claim_snapshots` 0. Cada una se resuelve por la regla de protección de §5 antes de cualquier retiro.

---

## 4 · Rutas que quedarán navegables

Sólo rutas definitivas; sin renderer paralelo, sin rutas especiales.

- `/` · Home (premium permanente)
- `/oriente-maya` · región
- `/oriente-maya/$destino` · 7 destinos (valladolid + 6 convertidos)
- `/oriente-maya/$destino/$categoria` · listados: hoteles, restaurantes, casas de vacaciones, experiencias/tours, artesanías, cenotes
- `/oriente-maya/$destino/$categoria/$empresa` · fichas de empresa (8 A + sustitutas B aprobadas)
- `/oriente-maya/$destino/$categoria/$empresa/$producto` · 4 productos A
- `/lugares/$slug` · 5 POI A
- Eventos: listado con **estado vacío correcto**
- Zona, Ruta y Artículo: **no productivos**; permanecen sólo como previews internos

Durante la evaluación: `noindex,nofollow` por entidad, exclusión de `sitemap.xml`, sin campañas, sin promesa de disponibilidad, sin etiqueta visible de prueba.

---

## 5 · Diseño de la herramienta "Contenido de evaluación"

Ruta propuesta: `/cms/contenido-evaluacion` (autenticada, `noindex`, rol admin/super_admin; borrado definitivo sólo Founder). Reutiliza `EntityListView` + `CmsEntityPage` — sin engine nuevo.

**Listado:** familia · nombre · destino · estado editorial · modo de presentación · portada elegible · dependencias · fecha de conversión · fuente. Filtros por familia, estado, destino y clase A/B/C/D/E.

**Acciones**
1. `Retirar` (individual) y `Retirar seleccionadas` / `Retirar todo el lote`.
2. `Previsualizar impacto` — muestra rutas que dejarán de resolver, planes de viaje afectados, entradas de Alux excluidas.
3. `Exportar snapshot` — JSON firmado con checksum por entidad.
4. `Restaurar` — sólo si el snapshot valida checksum y no hay conflicto de slug.

**Semántica de "Retirar" (por defecto, reversible, sin DELETE):**
`status → draft` · fuera del sitemap · excluida del catálogo canónico de Alux · auditoría y snapshot conservados · integridad referencial intacta.

**Borrado definitivo:** sólo Founder, segunda confirmación con inventario exacto, y **bloqueo automático** si la entidad: fue reclamada, tiene `business_users` activo, medios autorizados por el propietario, orden/pago/expediente real, reserva futura, o fue excluida del lote por aprobación Founder. La exclusión es automática, no manual: el retiro masivo filtra estas entidades antes de ejecutar.

**Mi Viaje:** una entidad retirada conserva referencia histórica legible en `travel_plan_items` con aviso "ya no está disponible"; nunca desaparece silenciosamente.

**Alux:** el catálogo canónico ya filtra `status = 'published'`; el retiro la excluye de inmediato. Alux distingue explorar / guardar / agregar a Mi Viaje / contactar y no afirma disponibilidad, reserva, pago, precio ni horario no acreditados.

---

## 6 · Gates que se ejecutarán en la fase de conversión (no ahora)

lint · typecheck · build · Route Inventory · F1C-A · G8-M1 · R1-D/E · gobernanza · seguridad · RLS · procedencia · deduplicación · rollback · retiro individual · retiro masivo · protección de reclamadas · exclusión de sitemap · exclusión de Alux · **fuga de `demo_seed_batch` en HTML/JSON-LD/sitemap/Alux (nuevo gate)**.

QA responsive en 390/430/768/1024/1280/1440 sobre Home, Oriente Maya, Pueblos Mágicos, destinos, seis listados, nueve familias individuales, ficha con y sin fotografía, Alux, Mi Viaje y navegación completa.

---

## 7 · Decisiones que requieren aprobación Founder antes de continuar

1. Aprobar la clasificación A/B/C/D/E de los 53 registros.
2. Autorizar el conjunto de sustituciones B (7 empresas + 1 producto) y sus fuentes permitidas.
3. Confirmar el archivado de los 10 eventos y el estado vacío de la familia Eventos.
4. Confirmar la reconciliación de `cenote-suytun` (conservar POI, retirar ficha de empresa).
5. Aprobar `noindex,nofollow` + exclusión de sitemap durante la evaluación.
6. Aprobar la ruta y el alcance de la herramienta "Contenido de evaluación".

**STOP.** Cero conversiones, cero retiros, cero publicación, flag OFF.
