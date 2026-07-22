# RV0 · Evidence Manifest — v1.1 (Corrección RV0.1)

**Fase:** RV0.1 · Investigación de referencias (corrección Founder).
**Fecha de captura núcleo original:** 2026-07-22 (`America/Merida`).
**Fecha de captura de ampliación:** 2026-07-22 (`America/Merida`).
**Motor:** Chromium headless vía Playwright.
**Viewports:** desktop `1280×1800` · mobile `390×1800` (sólo cuando aporta evidencia distinta).
**Reglas:** serie `RV-E*` separada de las evidencias congeladas `E01…E48` del Baseline V0. Imágenes Founder `FRV-01/FRV-02` no alteradas. Ninguna evidencia congelada tocada.

---

## 1. Referencias Founder (no cuentan como referencias externas)

| ID | Archivo | Origen | Estado |
|---|---|---|---|
| FRV-01 | `founder-refs/FRV-01-destino.png` | `user-uploads://Cenote_Zazil_Tunich_Experiencia_Maya-2.png` | Copia trazable, no alterada |
| FRV-02 | `founder-refs/FRV-02-zazil-premium-mobile.png` | `user-uploads://Cenote_Zazil_Tunich_viaje_al_inframundo-2.png` | Copia trazable, no alterada |

---

## 2. Cobertura probatoria 24 × 24 (una fila por referencia)

Clasificación de evidencia:
- **OK** — renderizado completo de la superficie principal, útil para evaluar los 15 ejes.
- **Limitada** — página accedida pero interceptada por consentimiento / anti-bot / interstitial; evidencia parcial.
- **No accesible** — imposible capturar desde la infraestructura externa el día de consulta.

| Ref | URL consultada | Superficie evaluada | Evidencia | Dispositivo | HTTP | Archivo | Estado | Limitación |
|---|---|---|---|---|---|---|---|---|
| R01 Visit California | `https://www.visitcalifornia.com/` | Home DMO | RV-E01 | desktop | 200 | `screenshots/RV-E01_visitcalifornia_desktop.png` | OK | — |
| R02 Switzerland Tourism | `https://www.myswitzerland.com/en-ch/` | Home DMO | RV-E02 | desktop | 200 | `screenshots/RV-E02_myswitzerland_desktop.png` | OK | — |
| R03 Visit Norway | `https://www.visitnorway.com/` | Home DMO | RV-E03 | desktop | 200 | `screenshots/RV-E03_visitnorway_desktop.png` | Limitada | Overlay de cookies persistente; archivo 41 KB, contenido editorial no plenamente visible |
| R04 Visit Iceland | `https://www.visiticeland.com/` | Home DMO | RV-E13 | desktop | 200 | `screenshots/RV-E13_visiticeland_desktop.png` | OK | — |
| R05 Tourism Australia | `https://www.australia.com/` (redirige a `/en`) | Home DMO / Signature Experiences | RV-E14 | desktop | 200 | `screenshots/RV-E14_australia_desktop.png` | OK | Redirección a `/en` registrada |
| R06 Visit Portugal | `https://www.visitportugal.com/en` | Home DMO | RV-E15 | desktop | 200 | `screenshots/RV-E15_visitportugal_desktop.png` | OK | — |
| R07 Airbnb Experiences (desktop) | `https://www.airbnb.com/experiences` | Marketplace de experiencias | RV-E04 | desktop | 200 | `screenshots/RV-E04_airbnb_experiences_desktop.png` | OK | — |
| R07 Airbnb Experiences (mobile) | `https://www.airbnb.com/experiences` | Marketplace de experiencias | RV-E05 | mobile | 200 | `screenshots/RV-E05_airbnb_experiences_mobile.png` | OK | Duplicado autorizado: mobile aporta evidencia de card-heroína/contador distinta a desktop |
| R08 Booking.com | `https://www.booking.com/` | Marketplace de hospedaje | RV-E16 | desktop | 202 | `screenshots/RV-E16_booking_desktop.png` | OK | Status 202 (respuesta de challenge intermedio); render de home cargó |
| R09 Aman Resorts | `https://www.aman.com/` | Home marca lujo | RV-E06 | desktop | 200 | `screenshots/RV-E06_aman_desktop.png` | OK | — |
| R10 Chablé Resorts | `https://www.chable.com/` (reintento; `chableresorts.com` no resuelve) | Home marca lujo territorial | RV-E10 | desktop | 200 | `screenshots/RV-E10_chable_desktop.png` | OK | Dominio primario `chableresorts.com` sin resolución DNS el día de consulta |
| R11 Grupo Habita | `https://grupohabita.mx/` | Home marca hotelería boutique | RV-E17 | desktop | 200 | `screenshots/RV-E17_grupohabita_desktop.png` | OK | — |
| R12 Nihi Sumba | `https://nihi.com/nihi-sumba/` → `https://nihi.com/` (fallback) | Home marca lujo (URL específica devuelve 404) | RV-E18 | desktop | 200 (fallback) | `screenshots/RV-E18_nihi_sumba_desktop.png` | Limitada | La URL específica `/nihi-sumba/` respondió 404; se capturó la home como fallback trazable |
| R13 AllTrails | `https://www.alltrails.com/` | Home mapa+contenido | RV-E07 | desktop | 200 | `screenshots/RV-E07_alltrails_desktop.png` | Limitada | Interstitial de consentimiento; archivo 40 KB, contenido editorial no visible |
| R14 Gaia GPS | `https://www.gaiagps.com/` | Home mapa técnico | RV-E19 | desktop | 200 | `screenshots/RV-E19_gaiagps_desktop.png` | Limitada | Overlay/consentimiento; archivo 61 KB, contenido editorial no plenamente visible |
| R15 Google Travel | `https://www.google.com/travel/things-to-do` | Vista lista+mapa | RV-E08 | desktop | 200 | `screenshots/RV-E08_googletravel_desktop.png` | OK | — |
| R16 Wanderlog | `https://wanderlog.com/` | Home itinerario+mapa | RV-E20 | desktop | 200 | `screenshots/RV-E20_wanderlog_desktop.png` | OK | — |
| R17 Rome2Rio | `https://www.rome2rio.com/` | Home planificador | RV-E21 | desktop | 403 | `screenshots/RV-E21_rome2rio_desktop.png` | Limitada | Challenge Cloudflare (`__cf_chl_rt_tk`); archivo 39 KB; contenido no visible |
| R18 Monocle | `https://monocle.com/` | Home editorial | RV-E09 | desktop | 200 | `screenshots/RV-E09_monocle_desktop.png` | OK | — |
| R19 Cereal Magazine | `https://readcereal.com/` (redirige a `www.`) | Home editorial contemplativa | RV-E22 | desktop | 200 | `screenshots/RV-E22_readcereal_desktop.png` | Limitada | Archivo 15 KB; renderizado de home no obtuvo contenido editorial visible |
| R20 Freunde von Freunden | `https://www.freundevonfreunden.com/` | Home editorial persona-lugar | RV-E23 | desktop | 200 | `screenshots/RV-E23_freundevonfreunden_desktop.png` | OK | — |
| R21 Atlas Obscura | `https://www.atlasobscura.com/` | Home descubrimiento patrimonial | RV-E12 | desktop | 200 | `screenshots/RV-E12_atlasobscura_desktop.png` | OK | — |
| R22 Culture Trip | `https://theculturetrip.com/` (reintentado `/travel`) | Home / vertical viajes | — | desktop | — | — | No accesible | `net::ERR_HTTP2_PROTOCOL_ERROR` en ambas rutas el día de consulta desde la infraestructura externa |
| R23 Visit México | `https://visitmexico.com/` (sin `www`; `www.visitmexico.com` sin resolución DNS) | Home DMO nacional | RV-E11 | desktop | 200 | `screenshots/RV-E11_visitmexico_desktop.png` | OK | Dominio `www.visitmexico.com` sin resolución DNS el día de consulta |
| R24 México Desconocido | `https://www.mexicodesconocido.com.mx/` | Home editorial nacional | RV-E25 | desktop | 403 | `screenshots/RV-E25_mexicodesconocido_desktop.png` | Limitada | Bloqueo anti-bot (403); archivo 15 KB; contenido editorial no visible |

---

## 3. Reconciliación numérica

| Concepto | Valor |
|---|---|
| Referencias externas seleccionadas (19.01) | 24 |
| Evidencias externas RV-E capturadas | 24 archivos (`RV-E01…RV-E25` menos `RV-E24`, más `RV-E05` mobile de R07) |
| Referencias con evidencia clasificada **OK** | 15 (R01, R02, R04, R05, R06, R07, R08, R09, R10, R11, R15, R16, R18, R20, R21, R23) — 16 filas |
| Referencias con evidencia **Limitada** | 7 (R03, R12, R13, R14, R17, R19, R24) |
| Referencias **No accesibles** | 1 (R22) |
| Referencias con captura mobile adicional | 1 (R07 · RV-E05), justificada porque aporta evidencia distinta |
| Referencias Founder (`FRV-*`) | 2 (no cuentan como externas) |
| Total archivos visuales en `screenshots/` | 24 |

Nota aritmética: R08 Booking figura como OK por render visible aunque el status HTTP fue 202 (challenge intermedio).

---

## 4. Integridad

- Núcleo probatorio visual entregado: **24 archivos externos** (`RV-E01…RV-E23, RV-E25`) + **2 archivos** Founder (FRV-01, FRV-02).
- 1 referencia sin evidencia propia (R22 Culture Trip) reclasificada; ver `19.05` §4.
- Ninguna evidencia congelada del Baseline V0 (E01…E48) fue tocada.
- Zona operativa `America/Merida` durante todas las capturas. `GAP-TZ-01` intacto.
- Cero cambios intencionales en producto, código, DB, Storage o configuración.

**Fin del manifiesto RV0.1 v1.1.**
