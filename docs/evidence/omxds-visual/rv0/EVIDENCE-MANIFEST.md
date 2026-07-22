# RV0 · Evidence Manifest — v1.0

**Fase:** RV0.1 · Investigación de referencias
**Fecha de captura:** 2026-07-22 (`America/Merida`)
**Motor:** Chromium headless vía Playwright.
**Viewports:** desktop `1440×1800` · mobile `390×1800`.
**Reglas:** serie `RV-E*` separada de las evidencias congeladas `E01…E48` del Baseline V0. Imágenes Founder `FRV-01/FRV-02` no alteradas.

---

## 1. Referencias Founder (no cuentan como referencias externas)

| ID | Archivo | Origen | Estado |
|---|---|---|---|
| FRV-01 | `founder-refs/FRV-01-destino.png` | `user-uploads://Cenote_Zazil_Tunich_Experiencia_Maya-2.png` | Copia trazable, no alterada |
| FRV-02 | `founder-refs/FRV-02-zazil-premium-mobile.png` | `user-uploads://Cenote_Zazil_Tunich_viaje_al_inframundo-2.png` | Copia trazable, no alterada |

---

## 2. Evidencias visuales externas capturadas

| ID | Ref | URL consultada | Viewport | Archivo | Estado |
|---|---|---|---|---|---|
| RV-E01 | R01 Visit California | `https://www.visitcalifornia.com/` | desktop | `screenshots/RV-E01_visitcalifornia_desktop.png` | OK |
| RV-E02 | R02 Switzerland Tourism | `https://www.myswitzerland.com/en-ch/` | desktop | `screenshots/RV-E02_myswitzerland_desktop.png` | OK |
| RV-E03 | R03 Visit Norway | `https://www.visitnorway.com/` | desktop | `screenshots/RV-E03_visitnorway_desktop.png` | OK (archivo pequeño; probable overlay de cookies) |
| RV-E04 | R07 Airbnb Experiences | `https://www.airbnb.com/experiences` | desktop | `screenshots/RV-E04_airbnb_experiences_desktop.png` | OK |
| RV-E05 | R07 Airbnb Experiences | `https://www.airbnb.com/experiences` | mobile | `screenshots/RV-E05_airbnb_experiences_mobile.png` | OK |
| RV-E06 | R09 Aman Resorts | `https://www.aman.com/` | desktop | `screenshots/RV-E06_aman_desktop.png` | OK |
| RV-E07 | R13 AllTrails | `https://www.alltrails.com/` | desktop | `screenshots/RV-E07_alltrails_desktop.png` | OK (archivo pequeño; probable interstitial de consentimiento) |
| RV-E08 | R15 Google Travel | `https://www.google.com/travel/things-to-do` | desktop | `screenshots/RV-E08_googletravel_desktop.png` | OK |
| RV-E09 | R18 Monocle | `https://monocle.com/` | desktop | `screenshots/RV-E09_monocle_desktop.png` | OK |
| RV-E10 | R10 Chablé Resorts | `https://www.chable.com/` (URL de reintento; el dominio `chableresorts.com` no resuelve desde la infraestructura externa el día de consulta) | desktop | `screenshots/RV-E10_chable_desktop.png` | OK (reintento) |
| RV-E11 | R23 Visit México | `https://visitmexico.com/` (sin `www`; DNS de `www.visitmexico.com` no resolvió el día de consulta — condición reportada) | desktop | `screenshots/RV-E11_visitmexico_desktop.png` | OK (reintento) |
| RV-E12 | R21 Atlas Obscura | `https://www.atlasobscura.com/` | desktop | `screenshots/RV-E12_atlasobscura_desktop.png` | OK |

### Evidencia diferida (no redundante — §8 del mandato)

Las siguientes referencias quedan **registradas con URL y fecha** pero sin captura en esta entrega para evitar capturas redundantes; las capturas se realizarán bajo solicitud Founder si RV0.2 se autoriza:

| Ref | URL | Motivo del diferimiento |
|---|---|---|
| R04 Visit Iceland | `https://www.visiticeland.com/` | Patrón editorial cubierto por R03 y R01 en las capturas presentes |
| R05 Tourism Australia | `https://www.australia.com/` | Patrón "Signature Experiences" descrito en 19.01 §3; captura no aporta evidencia distinta de R01 |
| R06 Visit Portugal | `https://www.visitportugal.com/` | Aporta principalmente paleta cálida, ya reflejada por R10 |
| R08 Booking.com | `https://www.booking.com/` | Referencia crítica de conversión; su estética es de dominio público |
| R11 Grupo Habita | `https://grupohabita.mx/` | Patrón cubierto por R10 y R09 |
| R12 Nihi Sumba | `https://nihi.com/nihi-sumba/` | Patrón cubierto por R09 |
| R14 Gaia GPS | `https://www.gaiagps.com/` | Patrón cartográfico especializado cubierto por R13 |
| R16 Wanderlog | `https://wanderlog.com/` | Patrón itinerario/mapa lateral descrito; captura no crítica |
| R17 Rome2Rio | `https://www.rome2rio.com/` | Patrón "cómo llegar" descrito; captura no crítica |
| R19 Cereal Magazine | `https://readcereal.com/` | Patrón editorial contemplativo cubierto por R18 |
| R20 Freunde von Freunden | `https://www.freundevonfreunden.com/` | Patrón narrativo persona-lugar descrito |
| R22 Culture Trip | `https://theculturetrip.com/` | Referencia crítica de densidad publicitaria; no requiere captura |
| R24 México Desconocido | `https://www.mexicodesconocido.com.mx/` | Referencia crítica editorial nacional; no requiere captura |

---

## 3. Integridad

- Núcleo probatorio visual entregado: **12 archivos** (RV-E01…RV-E12) + **2 archivos** Founder (FRV-01, FRV-02).
- Ninguna evidencia congelada del Baseline V0 (E01…E48) fue tocada.
- Zona operativa `America/Merida` durante todas las capturas. `GAP-TZ-01` intacto.
- Cero cambios en producto, código, DB, Storage, configuración.

**Fin del manifiesto RV0.1.**