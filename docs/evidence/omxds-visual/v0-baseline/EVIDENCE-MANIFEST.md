# Evidence Manifest — OMXDS Visual V0 · Baseline

**Estado:** No canónico (evidencia, no ingresa al universo documental gobernado).
**Baseline SHA:** `79ad4fa1ddb79490874dbe228cf96f0274caf281`
**Fecha de captura:** 2026-07-22
**Entorno:** Preview local · `http://localhost:8080` · Vite dev server · Chromium headless (Playwright).
**Viewports fijados:** desktop `1440×900` / móvil `390×844`; screenshots a alto extendido (3200 / 2400) para cubrir contenido below-the-fold sin usar `full_page`.
**Estado de datos:** Demo Pack Oriente Maya cargado en Supabase (proyecto ref `qjlfwsqsrzikjilicoad`).

---

## Convenciones

El `#` (E01…E36) es un identificador, no un campo. Cada captura documenta **exactamente 10 campos canónicos**:

1. **Ruta:** URL relativa capturada (sin dominio).
2. **Superficie:** ID (S01–S17) alineado con `docs/blueprint/18.07-OMXDS-VISUAL-SURFACE-INVENTORY-AUDIT-v1.0.md` §2.
3. **Viewport:** desktop = `1440` · móvil = `390`.
4. **Dimensiones:** `<width>×<height>` px del PNG resultante.
5. **Bytes:** tamaño del archivo PNG en bytes (referencia de integridad).
6. **Fecha:** día en que se ejecutó Playwright (mismo lote para las 36).
7. **Entorno:** siempre `preview local` — no producción.
8. **Estado datos:** `demo-pack` uniforme. `N/A` para 404. `estático` para páginas sin dataset.
9. **Observaciones:** hallazgo saliente visible en la captura.
10. **Documento receptor:** documento canónico donde la evidencia sustenta afirmaciones.

Detalle expandido:

- **Ruta:** URL relativa capturada (sin dominio).
- **Superficie:** ID (S01–S17) alineado con `docs/blueprint/18.07-OMXDS-VISUAL-SURFACE-INVENTORY-AUDIT-v1.0.md` §2.
- **Viewport:** desktop = `1440` · móvil = `390`.
- **Dimensiones completas:** `<width>×<height>` px del PNG resultante.
- **Bytes:** tamaño del archivo PNG en bytes (referencia integridad).
- **Fecha:** día en que se ejecutó Playwright (mismo lote para las 36).
- **Entorno:** siempre `preview local` — no producción.
- **Estado datos:** `demo-pack` uniforme. Casos `404` = evidencia de brecha, no dataset roto.
- **Documento que la referencia:** documento canónico donde la evidencia sustenta afirmaciones.

---

## 1440 px · Desktop (18 archivos)

| # | Ruta | Superficie | Viewport | Dimensiones | Bytes | Fecha | Entorno | Estado datos | Observaciones | Documento receptor |
|---|------|------------|----------|-------------|-------|-------|---------|--------------|---------------|--------------------|
| E01 | `/` | S01 · Home | 1440 | 1440×3200 | 3 047 040 | 2026-07-22 | preview local | demo-pack | LCP hero `bg01.webp` visible; composición publicada. | 18.06 §6 · 18.07 §3/§4/S01 |
| E02 | `/oriente-maya` | S02 · Región | 1440 | 1440×3200 | 402 580 | 2026-07-22 | preview local | demo-pack | Grid de destinos publicados. | 18.06 §6 · 18.07 S02 |
| E03 | `/oriente-maya/valladolid` | S03 · Destino | 1440 | 1440×3200 | 1 925 450 | 2026-07-22 | preview local | demo-pack | Hero destino + mapa Mapbox + colecciones. | 18.06 §6 · 18.07 S03 |
| E04 | `/oriente-maya/valladolid/cenotes` | S04 · Categoría-en-destino | 1440 | 1440×3200 | 523 250 | 2026-07-22 | preview local | demo-pack | Grid mínimo N2.1 (sin plantilla EB dedicada). | 18.06 §6 · 18.07 S04 |
| E05 | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 · Empresa | 1440 | 1440×3200 | 1 185 497 | 2026-07-22 | preview local | demo-pack (0 medios) | `cover_media_id = NULL`; hero débil. | 18.06 §6 · 18.07 S05 · 18.14 (piloto) |
| E06 | `/oriente-maya/valladolid/cenotes/zazil-tunich/nado-en-cenote` | S06 · Producto | 1440 | 1440×3200 | 715 537 | 2026-07-22 | preview local | demo-pack | Precio MXN 650; `product_type = experiencia`. | 18.06 §6 · 18.07 S06 |
| E07 | `/experiencias` | S07 · Listado plano | 1440 | 1440×3200 | 444 767 | 2026-07-22 | preview local | demo-pack | `TourismListingSurface` sin distinción empresa/producto. | 18.06 §6 · 18.07 S07 |
| E08 | `/hoteles` | S08 · Listado plano | 1440 | 1440×3200 | 327 671 | 2026-07-22 | preview local | demo-pack | Sin precio/disponibilidad. | 18.07 S08 |
| E09 | `/restaurantes` | S09 · Listado plano | 1440 | 1440×3200 | 303 783 | 2026-07-22 | preview local | demo-pack | Sin cocina/menú/precio. | 18.07 S09 |
| E10 | `/empresas` | S10 · Editorial B2B | 1440 | 1440×3200 | 79 583 | 2026-07-22 | preview local | estático | Layout con lucide icons + CTAs Portal. | 18.07 S10 |
| E11 | `/eventos` | S11 · Eventos | 1440 | 1440×3200 | 384 144 | 2026-07-22 | preview local | demo-pack (`upcomingOnly`, `limit=60`) | Sin JSON-LD `Event`. | 18.07 S11 |
| E12 | `/marketplace` | S12 · Redirect 301 | 1440 | 1440×3200 | 403 350 | 2026-07-22 | preview local | N/A | Captura equivale a `/oriente-maya` tras 301. | 18.07 S12 |
| E13 | `/arma-tu-viaje` | S13 · Trip Planner | 1440 | 1440×3200 | 85 683 | 2026-07-22 | preview local | sesión anónima vacía | Onboarding + planner con 0 items. | 18.07 S13 |
| E14 | `/blog` | S14 · Editorial · Agenda | 1440 | 1440×3200 | 117 222 | 2026-07-22 | preview local | demo-pack eventos | Contenido de transición (SEO.A1.2·D3). | 18.07 S14 |
| E15 | `/contacto` | S15 · Editorial · Contacto | 1440 | 1440×3200 | 103 265 | 2026-07-22 | preview local | estático | Sin `ContactPoint` JSON-LD. | 18.07 S15 |
| E16 | `/destinos` | S16 · Legacy 404 | 1440 | 1440×3200 | 58 694 | 2026-07-22 | preview local | N/A | Evidencia RI-01. | 18.06 §7 · 18.07 S16 |
| E17 | `/valladolid` | S17 · Legacy 404 | 1440 | 1440×3200 | 58 694 | 2026-07-22 | preview local | N/A | Evidencia RI-02. Tamaño idéntico a E16 confirma misma `notFoundComponent`. | 18.06 §7 · 18.07 S17 |
| E36a | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 · piloto ZT | 1440 | 1440×3200 | 1 185 497 | 2026-07-22 | preview local | demo-pack | Captura dedicada (bytes idénticos a E05). | 18.14 |

## 390 px · Móvil (18 archivos)

| # | Ruta | Superficie | Viewport | Dimensiones | Bytes | Fecha | Entorno | Estado datos | Observaciones | Documento receptor |
|---|------|------------|----------|-------------|-------|-------|---------|--------------|---------------|--------------------|
| E18 | `/` | S01 · Home | 390 | 390×2400 | 694 694 | 2026-07-22 | preview local | demo-pack | Hero legible; secciones apiladas. | 18.11 |
| E19 | `/oriente-maya` | S02 · Región | 390 | 390×2400 | 291 187 | 2026-07-22 | preview local | demo-pack | — | 18.11 |
| E20 | `/oriente-maya/valladolid` | S03 · Destino | 390 | 390×2400 | 259 860 | 2026-07-22 | preview local | demo-pack | Riesgo SI-28: mapa antes de secciones. | 18.11 · SI-28 |
| E21 | `/oriente-maya/valladolid/cenotes` | S04 · Categoría | 390 | 390×2400 | 246 757 | 2026-07-22 | preview local | demo-pack | Grid vertical denso. | 18.11 |
| E22 | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 · Empresa | 390 | 390×2400 | 154 419 | 2026-07-22 | preview local | demo-pack (0 medios) | Hero débil; productos como primer contenido significativo. | 18.11 · SI-04 |
| E23 | `/oriente-maya/valladolid/cenotes/zazil-tunich/nado-en-cenote` | S06 · Producto | 390 | 390×2400 | 271 706 | 2026-07-22 | preview local | demo-pack | Precio y CTA legibles. | 18.11 |
| E24 | `/experiencias` | S07 · Listado | 390 | 390×2400 | 320 575 | 2026-07-22 | preview local | demo-pack | Cards sin diferenciación vertical. | 18.11 · SI-09 |
| E25 | `/hoteles` | S08 · Listado | 390 | 390×2400 | 292 502 | 2026-07-22 | preview local | demo-pack | — | 18.11 · SI-10 |
| E26 | `/restaurantes` | S09 · Listado | 390 | 390×2400 | 267 910 | 2026-07-22 | preview local | demo-pack | — | 18.11 · SI-11 |
| E27 | `/empresas` | S10 · Editorial B2B | 390 | 390×2400 | 73 713 | 2026-07-22 | preview local | estático | H2 repetidos como etiquetas (SI-12). | 18.11 · 18.13 |
| E28 | `/eventos` | S11 · Eventos | 390 | 390×2400 | 315 701 | 2026-07-22 | preview local | demo-pack | Cards con exceso tipográfico (SI-29). | 18.11 · SI-29 |
| E29 | `/marketplace` | S12 · Redirect | 390 | 390×2400 | 291 187 | 2026-07-22 | preview local | N/A | Bytes coinciden con E19 tras 301 → mismo destino. | 18.07 S12 |
| E30 | `/arma-tu-viaje` | S13 · Planner | 390 | 390×2400 | 59 739 | 2026-07-22 | preview local | sesión vacía | Onboarding móvil. | 18.11 · S13 |
| E31 | `/blog` | S14 · Editorial | 390 | 390×2400 | 97 160 | 2026-07-22 | preview local | demo-pack eventos | Agenda cultural. | 18.11 · SI-17 |
| E32 | `/contacto` | S15 · Editorial | 390 | 390×2400 | 81 880 | 2026-07-22 | preview local | estático | — | 18.11 |
| E33 | `/destinos` | S16 · Legacy 404 | 390 | 390×2400 | 35 254 | 2026-07-22 | preview local | N/A | Evidencia RI-01 móvil. | 18.06 §7 |
| E34 | `/valladolid` | S17 · Legacy 404 | 390 | 390×2400 | 35 254 | 2026-07-22 | preview local | N/A | Evidencia RI-02 móvil. | 18.06 §7 |
| E36b | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 · piloto ZT | 390 | 390×2400 | 154 419 | 2026-07-22 | preview local | demo-pack (0 medios) | Captura dedicada (bytes idénticos a E22). | 18.14 |

## Totales

- **1440 px:** 17 capturas + 1 dedicada ZT = 18 archivos bajo `1440/` y `zazil-tunich/zt_desktop_1440x3200.png`.
- **390 px:** 17 capturas + 1 dedicada ZT = 18 archivos bajo `390/` y `zazil-tunich/zt_mobile_390x2400.png`.
- **Total archivos:** 36 PNG.
- **Tamaño total en disco:** ≈ 15 MB (confirmado con `du -sh`).

## Reglas de trazabilidad

1. Cualquier futura recaptura debe conservar el mismo nombre de archivo para preservar los IDs `E01…E36`.
2. Los IDs `E16`, `E17`, `E33`, `E34` documentan brechas de ruta (404) y no deben eliminarse hasta cerrar `RI-01` y `RI-02` en V1.
3. Este manifiesto es **no canónico** — no incrementa el universo documental gobernado (447 → 449 sólo cuentan `18.06` y `18.07`).
4. Con Checkpoint 2 el universo documental gobernado pasa a **451** al incluir `18.08 · Media Inventory` y `18.09 · Map Audit`.

---

## 4. Inventario de medios (Checkpoint 2 · `18.08`)

CSVs sanitizados (sin URLs firmadas, tokens ni valores privados):

| Archivo | Filas | Contenido | Documento receptor |
|---|---:|---|---|
| `media/media_assets_inventory.csv` | 11 | `storage_bucket, storage_path, kind, mime_type, width, height, size_bytes, alt_text, is_demo_seed` | `18.08 §4/§7` |
| `media/storage_objects_inventory.csv` | 45 | `bucket_id, object_path, bytes, mime` | `18.08 §3/§7` |

Zazil Tunich (piloto Premium): sin filas en `business_media`, sin `cover_media_id`, sin fotos propias en Storage. Referencia expandida en `18.08 §8`.

---

## 5. Inventario de mapas (Checkpoint 2 · `18.09`)

CSV sanitizado (sin coordenadas fuera del territorio y sin credenciales):

| Archivo | Filas | Contenido | Documento receptor |
|---|---:|---|---|
| `maps/business_coordinates.csv` | 26 | `business_slug, latitude, longitude, address_line1, is_primary` | `18.09 §4/§5` |

Notas:

- **1 par duplicado exacto:** `(20.7186, -88.1483)` — hallazgo `MA-04`.
- **1 registro sin coordenadas:** hallazgo `MA-10`.
- **Zazil Tunich:** `(20.7167, -88.25)` — precisión ~±1 km en longitud; hallazgo `MA-03`.
- **Sin capturas Playwright adicionales:** los mapas quedan documentados textualmente porque el diagnóstico se realiza sobre configuración y datos, no sobre superficies nuevas. Las capturas de `BusinessLocationBlock` renderizado ya están dentro de E05 y E22.

---

**Fin del manifiesto.**
---

## Checkpoint 4 · Rendimiento y Accesibilidad (America/Merida · UTC)

Zona operativa canónica: **`America/Merida`** (UTC−6, sin DST). Los reportes JSON/TSV bajo `performance/` y `accessibility/` conservan timestamps ISO-8601 en **UTC**; la conversión a `America/Merida` se documenta exclusivamente en los documentos canónicos `18.12` y `18.13`. La reentrega previa etiquetó la zona local como `America/Mexico_City`; se corrige a `America/Merida` (offset y fechas locales idénticos hasta hoy).

**Ventanas definitivas:**

- `18.12 · Performance Baseline` — Inicio UTC `2026-07-22 03:12` · Fin UTC `2026-07-22 05:47` · Inicio `America/Merida` `2026-07-21 21:12` · Fin `America/Merida` `2026-07-21 23:47` · **No cruzó medianoche local**.
- `18.13 · Accessibility Baseline` — Inicio UTC `2026-07-22 05:50` · Fin UTC `2026-07-22 07:20` · Inicio `America/Merida` `2026-07-21 23:50` · Fin `America/Merida` `2026-07-22 01:20` · **Sí cruzó medianoche local**.
- **Ventana global Checkpoint 4** — UTC `2026-07-22 03:12–07:20` · `America/Merida` `2026-07-21 21:12 → 2026-07-22 01:20`.

Las entradas E01…E36 del índice canónico (Checkpoints 1–3, ya aprobados) conservan sus marcas temporales originales por estar fuera del alcance de esta corrección.

> **GAP-TZ-01 · Política canónica de zona horaria ausente.** UTC continúa como base de almacenamiento; `America/Merida` queda como zona comercial y operativa canónica. La aplicación pública renderiza actualmente numerosas fechas con la zona del navegador. Remediación en fase posterior. No modifica hallazgos `PF-01…PF-10` ni `AX-01…AX-12` y no genera documento canónico adicional.

Evidencia adicional bajo `performance/` y `accessibility/`. Reportes tabulares/JSON — no capturas — por lo que el índice canónico E01…E36 se conserva sin ampliar; los nuevos artefactos son referencias documentales para `18.12` y `18.13` y **no incorporan documentos al universo canónico**.

### Performance

- `performance/http-baseline.tsv` — HTTP/TTFB/tamaño/cache-control de las 17 superficies (sandbox). Documento receptor: `18.12`.
- `performance/lab/lab-metrics.json` — Métricas de laboratorio (LCP, FCP, CLS, TBT, recursos, terceros) sobre muestra 9 × 2 viewports. Documento receptor: `18.12`.

### Accessibility

- `accessibility/axe.min.js` — axe-core 4.10.2 congelado localmente para reproducibilidad. Documento receptor: `18.13`.
- `accessibility/axe-report.json` — Violaciones + estructura semántica sobre muestra 9 × 2 viewports. Documento receptor: `18.13`.

### Sanitización

Ningún artefacto contiene cookies, tokens, claves, headers de autenticación, URLs firmadas utilizables (los signed URLs de Supabase se citan truncados como host + prefijo), datos personales, secretos ni contenido privado.

### SHA de trabajo

`8f7bfc17271c907339fe484a449650c3ca766b1d`

---

## Checkpoint 5 · Zazil Tunich y Empresa Premium (America/Merida · UTC)

Ventana de ejecución: UTC `2026-07-22 03:35 → 04:12` · `America/Merida` `2026-07-21 21:35 → 22:12` (no cruzó medianoche local).

Serie reservada definitiva: **E37…E48** (12 artefactos). Documento receptor único: `docs/blueprint/18.14-OMXDS-VISUAL-PREMIUM-CASE-ZAZIL-TUNICH-v1.0.md`.

### E37…E48 · 10 campos canónicos por artefacto

| # | Ruta / Fuente | Superficie | Viewport | Dimensiones | Bytes | Fecha (UTC) | Entorno | Estado datos | Observaciones | Documento receptor |
|---|---|---|---:|---|---:|---|---|---|---|---|
| E37 | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 detalle | 390 | 390×1800 | 116 066 | 2026-07-22 | preview local | demo-pack (0 medios) | Hero débil sin imagen propia. | 18.14 §3 ZT-01/09 |
| E38 | `/oriente-maya/valladolid/cenotes/zazil-tunich` | S05 detalle | 1440 | 1440×1800 | 191 898 | 2026-07-22 | preview local | demo-pack (0 medios) | Peso muy inferior a destino con hero (E42). | 18.14 §3 ZT-01/09 |
| E39 | `/oriente-maya/valladolid/cenotes` | S04 categoría | 390 | 390×1800 | 177 807 | 2026-07-22 | preview local | demo-pack | Contexto Zazil en listado. | 18.14 §2 D2 |
| E40 | `/oriente-maya/valladolid/cenotes` | S04 categoría | 1440 | 1440×1800 | 219 389 | 2026-07-22 | preview local | demo-pack | — | 18.14 §2 D2 |
| E41 | `/oriente-maya/valladolid` | S03 destino | 390 | 390×1800 | 247 966 | 2026-07-22 | preview local | demo-pack | Contraste con ZT (hay hero). | 18.14 §3 ZT-09 |
| E42 | `/oriente-maya/valladolid` | S03 destino | 1440 | 1440×1800 | 1 620 721 | 2026-07-22 | preview local | demo-pack | Referencia de peso con hero real. | 18.14 §3 ZT-09 |
| E43 | `/oriente-maya/valladolid/cenotes/zazil-tunich/nado-en-cenote` | S06 producto | 390 | 390×1800 | 201 226 | 2026-07-22 | preview local | demo-pack (sin cubierta) | Sin foto de producto. | 18.14 §3 ZT-04/11 |
| E44 | `/…/nado-en-cenote` | S06 producto | 1440 | 1440×1800 | 383 682 | 2026-07-22 | preview local | demo-pack (sin cubierta) | — | 18.14 §3 ZT-04/11 |
| E45 | `/empresas` | S10 editorial B2B | 390 | 390×1800 | 69 763 | 2026-07-22 | preview local | estático | Contexto Premium. | 18.14 §2 D2 |
| E46 | `/empresas` | S10 editorial B2B | 1440 | 1440×1800 | 70 617 | 2026-07-22 | preview local | estático | — | 18.14 §2 D2 |
| E47 | JSON-LD renderizado en detalle ZT (`<script type="application/ld+json">`) | S05 detalle | 1440 | — | 2 306 | 2026-07-22 | preview local | render-time | `TouristAttraction` mínimo (falta `image`, `geo`, `openingHours`, `priceRange`). | 18.14 §3 ZT-07 |
| E48 | Consulta SQL READ-ONLY de ausencia + entidad (Supabase) | DB pública | — | — | ≈ 1 700 | 2026-07-22 | Supabase (svc-read) | columnas mínimas · sin PII | Confirma D1/D3/D4/D10 y ausencias. | 18.14 §3 ZT-02/04/05/12/13 |

Notas:

- E37…E46 son PNG bajo `premium-case-zazil-tunich/screenshots/`.
- E47 es JSON bajo `premium-case-zazil-tunich/extracts/E47_jsonld_detail.json`.
- E48 es SQL bajo `premium-case-zazil-tunich/queries/E48_absence_report.sql`.
- Sin PII de propietario ni viajeros en ningún artefacto (`leak=false` verificado en las 10 capturas).
- Sin reejecución de Lighthouse/axe (política Checkpoint 5).
- Ausencias registradas como `N/A – ausencia verificada` en 18.14 §8.

### SHA de trabajo Checkpoint 5

Por confirmar en cierre Founder.
