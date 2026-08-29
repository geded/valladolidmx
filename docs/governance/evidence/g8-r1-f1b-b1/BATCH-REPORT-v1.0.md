# G8-R1-F1B-B1 · Primer lote real desde fuentes públicas — Batch Report v1.0

Autoridad: Autorización Founder G8-R1-F1B-B1 (sobre el modelo cerrado en G8-R1-F1B-S1).
Estado: **Lote creado en draft.** Cero publicación, cero indexación, cero reclamación.
Cobertura territorial autorizada: Valladolid, Tinum, Temozón.

## 1. Método

1. Investigación exclusivamente en **sitios oficiales** de cada establecimiento (lectura de página pública).
2. Extracción únicamente de **hechos objetivos publicados por el propio titular**: nombre comercial, domicilio, teléfono, correo, redes oficiales, sitio web.
3. **Cero copia** de texto protegido: toda descripción es original, breve y objetiva, redactada a partir de hechos.
4. **Cero OTA / cero Google Maps** como fuente.
5. Registro de **procedencia campo por campo** en `entity_field_provenance` (`source_kind='official_site'`, `verification_level='source_checked'`).
6. Alta con `status='draft'`, `record_origin='public_source'`, `source_review_state='in_review'`, `verified=false`, `can_self_publish=false`, `metadata.robots='noindex,nofollow'`, caducidad de verificación a 180 días.

## 2. Fichas creadas (15 de un máximo de 30)

### Hoteles y hospedaje (8)

| Ficha | Destino | Fuente oficial | Datos capturados |
|---|---|---|---|
| Lemuuch Hotel Boutique | Valladolid | lemuuchhotel.com | domicilio, 2 teléfonos, web |
| Casa Quetzal Hotel Boutique | Valladolid | casa-quetzal.com | domicilio, teléfono, correo, web |
| Hotel Quinta Marciala | Valladolid | hotelquintamarciala.com.mx | teléfono, Facebook, web |
| Hotel Bernardino | Valladolid | hotelbernardino.mx | domicilio, correo, web |
| Hotel Zenti'k Project | Valladolid | hotelzentik.com | teléfono, correo, Facebook, Instagram, web |
| Hotel Olbil | Valladolid | olbilhotel.com | domicilio, correo, web |
| Sutuk Hotel | Valladolid | sutuk.mx | domicilio, teléfono, correo, web |
| Hotel Chichén Itzá (Mayaland) | Tinum (Pisté) | mayaland.com | domicilio, teléfono, correo, web |

### Restaurantes (4)

| Ficha | Destino | Fuente oficial | Datos capturados |
|---|---|---|---|
| El Sazón de Valladolid | Valladolid | sazondevalladolid.com | domicilio, teléfono, Facebook, web |
| Restaurante Ix Cat Ik | Valladolid | ixcatik.mx | sólo web (ficha mínima) |
| Paladar de Cura | Valladolid | paladardecura.com.mx | domicilio, teléfono, web |
| Sikil Restaurante | Valladolid | sikil.mx | domicilio, correo, Facebook, Instagram, web |

### Operadores y experiencias (3)

| Ficha | Destino | Fuente oficial | Datos capturados |
|---|---|---|---|
| Valladolid Expeditions | Valladolid | valladolidexpeditions.mx | domicilio, teléfono, correo, Instagram, web |
| Mayan World Tours | Valladolid | mayanworldtours.com | teléfono, correo, Facebook, Instagram, web |
| Sagrado Valladolid | Valladolid | sagradovalladolid.com | teléfono, correo, web |

## 3. Candidatos rechazados

| Candidato | Motivo |
|---|---|
| Hacienda Temozón | Ubicada en **Temozón Sur, Abalá** — no corresponde al municipio de Temozón autorizado. Riesgo de error territorial. |
| Lakin Tours | Sitio oficial no respondió; sin fuente verificable. |
| Cielo Hamacas | Contacto y operación con base en Mérida; identidad territorial no acreditable en el ámbito autorizado. |
| Centro Artesanal Zaci | Sin sitio oficial propio; sólo fuentes de terceros/OTA. |
| Casa Valladolid | Sitio oficial sin datos de contacto verificables suficientes (sólo red social). Queda en cola para siguiente lote. |

## 4. Brechas declaradas (bloquean publicación)

1. **Medios**: 15/15 fichas sin fotografía propia con autoría, licencia, crédito, ALT y punto focal. Prohibido usar imágenes de los sitios oficiales sin licencia.
2. **Geolocalización**: 15/15 sin coordenadas (Geolocation Mandatory Rule). Se registró `metadata.geo='pending_operator_authorization'`; captura vía `BusinessLocationPanel` al reclamar o con autorización editorial.
3. **SEO/entidad**: sin `seo_metadata` ni JSON-LD por ficha (Entity First SEO).
4. **Horarios**: no capturados; sólo se aceptarán si el titular los publica o los confirma.
5. **Temozón**: sin candidatos válidos con fuente oficial. Requiere trabajo de campo o convenio municipal.

## 5. Reclamación

Todas las fichas nacen **unclaimed**. Se aplica el **Discreet Claim UX**: sin badges ni alertas; sólo el enlace secundario al pie de la ficha cuando la ficha llegue a estado aprobado. "Establecimiento verificado" permanece deshabilitado.

## 6. Reversibilidad

Rollback total: `DELETE FROM public.businesses WHERE metadata->>'batch'='G8-R1-F1B-B1';` (borra en cascada contactos, ubicaciones, redes y vínculos de categoría; la procedencia se elimina con la entidad).

## 7. STOP CONDITION

Lote creado y reconciliado en draft. **No se publica, no se indexa, no se aprueba editorialmente, no se inicia R1-F.** Siguiente paso sujeto a autorización del Founder: curaduría editorial + medios con licencia + geolocalización.
