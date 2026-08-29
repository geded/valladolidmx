# G8-R1-F1B-B4 · Aprobación editorial interna y paquete de reclamación · v1.0

Autorización: Founder · G8-R1-F1B-B4
Alcance: 15 fichas `record_origin = 'public_source'` creadas en B1, revisadas en B2 y geolocalizadas en B3.
Estado: **CERRADA**. Cero publicación, flag OFF, sin sitemap ni redirects, sin contacto automático a empresas.

## 1 · Clasificación final

### Grupo A — Aprobadas y listas para Release Candidate con marcador neutral (3)

| Ficha | Categoría | Ruta canónica futura | Geo | Contactos | Procedencia |
|---|---|---|---|---|---|
| El Sazón de Valladolid | Restaurantes | `/oriente-maya/valladolid/restaurantes/el-sazon-de-valladolid` | calle | 2 | 8 |
| Sikil Restaurante | Restaurantes | `/oriente-maya/valladolid/restaurantes/sikil-restaurante` | calle | 2 | 9 |
| Valladolid Expeditions | Experiencias y tours | `/oriente-maya/valladolid/experiencias-tours/valladolid-expeditions` | calle | 3 | 9 |

### Grupo B — Aprobadas, bloqueadas para RC hasta recibir fotografía autorizada (3)

| Ficha | Categoría | Ruta canónica futura | Geo | Contactos | Procedencia |
|---|---|---|---|---|---|
| Hotel Olbil | Hoteles | `/oriente-maya/valladolid/hoteles/hotel-olbil` | calle | 2 | 7 |
| Lemuuch Hotel Boutique | Hoteles | `/oriente-maya/valladolid/hoteles/lemuuch-hotel-boutique` | calle | 3 | 7 |
| Sutuk Hotel | Hoteles | `/oriente-maya/valladolid/hoteles/sutuk-hotel-valladolid` | calle | 3 | 8 |

Los hoteles mantienen portada obligatoria por estándar premium: sin fotografía autorizada no entran al Release Candidate, aunque su revisión editorial ya está aprobada.

### Grupo C — Requieren información del operador (9)

Casa Quetzal Hotel Boutique · Hotel Bernardino · Hotel Chichén Itzá (Tinum) · Hotel Quinta Marciala · Hotel Zenti'k Project · Mayan World Tours · Paladar de Cura · Restaurante Ix Cat Ik · Sagrado Valladolid.

Permanecen en `draft` / `in_review`, `noindex,nofollow`, con geolocalización `pending_manual_confirmation`. **No se ejecutó geocodificación automática ni aproximación al centro territorial.**

## 2 · Mínimos acreditados en las 6 fichas aprobadas

Identificador estable · identidad comercial · categoría · destino y zona · coordenadas acreditadas (ODbL, precisión calle) · domicilio · contacto oficial · horarios con fallback textual (`never_show_open_now`, sin horario publicado) · descripción original · procedencia campo por campo · vigencia · SEO propio · JSON-LD · ruta canónica del contrato de navegación · marcador neutral de imagen · reclamación discreta al pie · disponibilidad para Alux · guardar y añadir a Mi Viaje.

Sello editorial escrito en `businesses.metadata.editorial_approval`, con `publication: false`, `claim_state: 'unclaimed'`, `badge: false`, `direct_sale: false`, `robots: 'noindex,nofollow'` y `previous_source_review_state` para reversión.

## 3 · Paquete de reclamación (las 15 fichas)

Escrito en `businesses.metadata.claim_package`:

- Nombre, identificador, ruta pública futura, enlace interno de reclamación y enlace de preview.
- Campos actualmente presentes y fuentes oficiales utilizadas.
- Datos que faltan y que sólo el operador puede confirmar.
- Instrucciones de acreditación de representación (identidad legal, control de canal oficial, declaración de veracidad y autorización de fotos, aprobación administrativa).
- Texto sugerido de invitación (uso interno, **no enviado**: `contact_sent: false`).
- Texto público único permitido: «¿Representas a este establecimiento? Administra esta ficha», exclusivamente como enlace secundario al pie de la ficha.

«Establecimiento verificado» permanece apagado en las 15 fichas.

## 4 · Solicitud de medios

`businesses.metadata.media_request` v2, con puerta de entrada única G8-M1:

- Portada horizontal obligatoria 16:9 (mínimo 2000×1125).
- Galería mínima: 6 imágenes en hoteles, 4 en el resto.
- Versión vertical 4:5 obligatoria en hoteles para móvil.
- Resolución mínima 1600 px en el lado largo; formatos jpg / png / webp.
- Requisitos por imagen: autor, licencia, crédito, ALT descriptivo, punto focal y declaración de autorización.
- Prohibida la descarga de fotografías de sitios oficiales, redes, Google u OTA.

## 5 · Vista previa y QA

QA ejecutado sobre `/cms/empresas/{id}/preview` (superficie productiva real, sólo staff autenticado, `noindex`): jerarquía, marcador neutral, ausencia de espacios vacíos rotos, mapa con coordenadas acreditadas, reclamación discreta al pie, cero badges de «no reclamada» en tarjetas y cero CTA de venta directa.

## 6 · Reversión

Cada ficha registró una entrada en `content_audit_log` (`editorial_source_review_approved` / `editorial_operator_confirmation_requested`) con el estado previo y las claves de metadata añadidas, suficiente para revertir el lote completo sin pérdida de datos.

## 7 · Veredicto

- Fichas aprobadas editorialmente: **6** (3 Grupo A + 3 Grupo B).
- Fichas pendientes de operador: **9**.
- Publicadas: **0**. Reclamadas: **0**. Verificadas: **0**.
- **G8-R1-F1B-B4 · CERRADA Y ACREDITADA.**
