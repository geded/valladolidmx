# G8-R1-F1E-0 · Auditoría integral READ-ONLY del CMS como Sistema Operativo Turístico

Fecha: 2026-08-29 · Modo: READ-ONLY (cero escrituras de código, schema, datos, flags, medios, ramas)
Gates ejecutados: lint PASS (deuda histórica 219/68 sin incremento) · typecheck PASS · build PASS ·
Route Inventory 219 rutas PASS · QA responsive 390/768/1440 sobre 9 rutas públicas: overflow 0, consola limpia, 1 H1 por página.

---

## 1 · Inventario del CMS (resumen por dominio)

| Área | Ruta | Rol | Fuente | Estado real |
|---|---|---|---|---|
| Panel CMS | `/cms` | admin/editor | mixto | Operativo |
| Destinos / Regiones / Zonas | `/cms/destinos*`, `/cms/regiones*`, `/cms/zonas*` | admin | tablas territoriales | Alta/edición operativa; **zonas con 0 registros** |
| Empresas | `/cms/empresas*` (+ preview) | admin/editor | `businesses` + relaciones | Operativo, con procedencia por campo (97 filas) |
| Productos | `/cms/productos*` | admin/editor | `products` | Operativo |
| Lugares | `/cms/lugares*` | admin | `points_of_interest` | Operativo |
| Categorías | `/cms/categorias*` | admin | `business_categories` (15) | Operativo |
| Medios | `/cms/media` | admin/editor | `media_assets` (32, 29 aprobados, 33 variantes) | Operativo |
| Reseñas | `/cms/reviews*` | admin/editor | `reviews` (12) | Moderación operativa |
| Experience Builder / Studio | `/cms/experience-builder*` | admin/super_admin | `page_compositions` (15/10 pub) | Operativo |
| Alux | `/cms/alux`, `.conocimiento`, `.calidad`, `.feedback` | admin | `alux_*` | Operativo; KB 15/12 pub |
| Visitor Intel | `/cms/visitor-intel`, `_.decisions` | admin/super_admin | `visitor_intel.events` | **Infraestructura sí, datos no (1 evento)** |
| Travel Plans | `/cms/travel-plans` | admin | `travel_plans` (8) | Lectura operativa |
| Ventas en línea / Pagos | `/cms/ventas-en-linea`, `/cms/pagos` | admin | `concierge_orders` (1) | Backoffice mínimo; sin motor de reservas |
| RC Visual | `/cms/rc-visual` | admin | real | Hub canario interno |
| Portal Empresa | `/portal/*` (23 rutas) | owner/manager/editor | scoping por `business_users` (3) | Operativo con permisos |
| Workspace Concierge | `/concierge`, `/concierge/expedientes/$caseId` | concierge | `concierge_cases` (2) | Expediente sí; **sin Alux** |
| Viajero | `/cuenta/mi-viaje`, `/mi-viaje` | traveler | `travel_plans` + memoria | Operativo |

## 2 · Modelo territorial

Cadena Región → Destino → Zona → Entidad → ruta canónica: **rota en el eslabón Zona (0 filas)**.

| Familia | Modelo | CMS | Territorial | Ruta pública | Plantilla premium | Contenido real | Estado |
|---|---|---|---|---|---|---|---|
| Región Oriente Maya | Sí | Sí | Sí | Sí | Sí | 1 | PASS |
| Destinos | Sí | Sí | Sí | Sí | Sí | 10 / 7 pub | PASS |
| Zonas | Sí | Sí | — | Preview | Preview | **0** | AUSENTE (contenido) |
| Categorías | Sí | Sí | Sí | Sí | n/a | 15 | PASS |
| Empresas (genérico) | Sí | Sí | Sí | Sí | Sí | 46 / 26 pub | PARCIAL |
| Hoteles | Sí | Sí | Sí | Sí | Sí | subconjunto | PARCIAL |
| Restaurantes | Sí | Sí | Sí | Sí | Sí | subconjunto | PARCIAL |
| Casas de vacaciones | Sí | Sí | Sí | Sí | Sí | sin lote real | PREVIEW |
| Productos/Experiencias/Tours | Sí | Sí | Sí | Sí | Sí | 9 pub | PARCIAL |
| Eventos | Sí | Sí | Sí | Sí | Sí | 10 pub | PARCIAL |
| Lugares/Atractivos | Sí | Sí | Sí | Sí | Sí (6 variantes) | 7 / 5 pub | PASS |
| Rutas/Itinerarios | Sí | Parcial | Parcial | Preview | Preview | 3 | PREVIEW |
| Artículos/Guías | Sí | Parcial | Parcial | Preview | Preview | **0** | AUSENTE |
| Landing SEO | Sí | Sí | Sí | Sí | Sí | 4 seo_metadata | PARCIAL |

Huérfanos/brechas: 0 zonas ligadas a destinos; 0 `page_redirects`; sólo **3** empresas publicadas con portada (`cover_media_id`), 34 con geolocalización.

## 3 · Workflow editorial

Máquina única `src/lib/cms/workflow.ts` + `transitionEntityStatus` con `assertEditorial`, regla Geolocation Mandatory fail-closed, auditoría (`content_audit_log` 472 filas) y revisiones (`page_revisions` 43). **No se acredita separación autor/aprobador** (un mismo editor puede enviar y aprobar). Programación y despublicación temporizada: no acreditadas. Empresa no puede aprobar, verificar, publicar ni tocar otra empresa (scoping por `business_users` + RLS).

## 4 · Sistema visual premium

Asignación automática de familia (`presentation-family.ts`) fail-closed correcta. **Bloqueante estructural: `entity_presentation_modes` tiene 0 filas** → ninguna entidad productiva tiene modo persistido; todo resuelve por defecto. Los contratos premium en `producto/$slug` y `eventos/$slug` están detrás de `omxds_visual_v1_contracts_enabled = false`.

Clasificación: Home, Destino y Lugares = **PARIDAD ACREDITADA**; Hotel/Restaurante/Empresa genérica/Producto/Evento = **PARCIAL** (plantilla lista, modo no persistido, flag apagado); Casa de vacaciones, Zona, Ruta, Artículo = **PREVIEW**.

## 5 · Medios G8-M1

Original inmutable + derivados + `resolveMediaSource` operativos (32 assets, 29 aprobados, 33 variantes). Fallback Editorial con marcador neutral verificado; galería vacía se omite. Riesgo: cobertura fotográfica insuficiente (3 de 26 empresas publicadas con portada) ⇒ Cinematográfica no elegible para la mayoría.

## 6 · Datos reales en plantillas

Adaptadores/DTO omiten bloques vacíos y no inventan contenido (verificado en superficies de destino, lugar, producto, evento). Vacíos reales hoy: reseñas acreditadas escasas, precios informativos parciales, FAQ y accesibilidad casi sin datos.

## 7 · Alux como concierge del explorador

Catálogo canónico filtra `status='published'` en las 4 lecturas. Personalización determinista, proximidad Haversine, memoria anónima, explicación de recomendaciones, un dock y un planner: **IMPLEMENTADO**. Métrica de uso real: `alux_public_sessions = 0`, `alux_public_messages = 0` → sin tráfico acreditado.

## 8 · Earn Registration y continuidad

Continuidad anónima (IndexedDB + fallback local), fusión idempotente y TTL: IMPLEMENTADO. `traveler_memory_projection = 0` filas → continuidad multidispositivo **NO ACREDITADA empíricamente**.

## 9 · Alux como copiloto del concierge humano

`getAluxConciergeContext` sólo lo consume `/cuenta/mi-viaje` (viajero). El expediente `/concierge/expedientes/$caseId` no importa ninguna capacidad Alux. Veredicto: **AUSENTE** como copiloto del concierge (contrato existe, superficie no).

## 10 · Mi Viaje

Guardar ≠ Agregar diferenciados; 8 planes / 20 ítems reales; aceptación explícita de propuestas; sin mutaciones silenciosas. Acceso del concierge con autorización: PARCIAL.

## 11 · Empresas y reclamación

Alta administrativa y desde fuentes públicas con procedencia por campo (97), reclamación discreta, transferencias (2). **`business_claim_snapshots = 0`** → snapshot pre-reclamo no ejercido. Analítica de empresa agregada; sin exposición de perfiles individuales.

## 12 · Conocimiento territorial real

1 región · 10 destinos (7 pub) · **0 zonas** · 46 empresas (26 pub) · 9 productos · 10 eventos · 7 lugares · 3 rutas · 0 artículos · KB 15 (12 pub).

**Respuesta expresa:** Alux **no** conoce hoy todo el Oriente Maya de Yucatán. Conoce exclusivamente el subconjunto cargado y publicado, concentrado en Valladolid/Tinum.

## 13 · Reservaciones y venta en línea

Brecha independiente confirmada: no existe motor de disponibilidad, inventario, tarifas, variantes, carrito real, checkout de pago, confirmaciones, cancelaciones, reembolsos ni conciliación. Existen campos comerciales (`conversion_mode`, órdenes de concierge: 1) y backoffice de lectura. **AUSENTE como módulo funcional.**

## 14 · Monitor de anónimos y estadísticas

`visitor_intel.events`: **1 evento, 1 sujeto, 0 simulación**. Existen ingesta fail-closed, rate limit durable, agregadores, umbrales k-anonimato (25) y dashboards. **No hay monitor operativo**: hay infraestructura sin datos.

## 15 · Matriz del ciclo operativo

| Etapa | Sistema | Autoridad | Estado |
|---|---|---|---|
| Inventariar territorio | CMS territorial | Admin | PARCIAL (zonas 0) |
| Crear y verificar entidad | CMS + procedencia | Admin/Editor | PASS |
| Gestionar medios | G8-M1 | Editor/Admin | PASS (cobertura baja) |
| Publicar contenido | Workflow | Editor/Admin | PARCIAL (sin autor≠aprobador) |
| Descubrir | Discovery Layer | Público | PASS |
| Personalizar | Alux | Sistema | PASS |
| Guardar | Mi Viaje | Viajero | PASS |
| Armar viaje | Mi Viaje/Planner | Viajero | PASS |
| Recomendar | Alux | Sistema | PASS |
| Atender por concierge | Workspace | Concierge | PARCIAL |
| Solicitar/reservar | — | — | AUSENTE |
| Prestar servicio | Vouchers | Empresa | PARCIAL |
| Evaluar | Reseñas | Viajero | PARCIAL |
| Recordar | Memoria/Passport | Sistema | PARCIAL |
| Medir | Visitor Intel | Admin | BLOQUEADA (sin datos) |
| Mejorar oferta | Decisiones | Admin | BLOQUEADA |

## 16 · Defectos (severidad)

1. **BLOQ-01 (crítico):** `entity_presentation_modes` vacío → autoridad de presentación sin uso productivo.
2. **BLOQ-02 (crítico):** 0 zonas territoriales → cadena canónica incompleta.
3. **BLOQ-03 (crítico):** cobertura fotográfica 3/26 empresas publicadas → Cinematográfica no elegible.
4. **ALTO-04:** Alux ausente del Workspace de concierge.
5. **ALTO-05:** Visitor Intel sin ingesta real (1 evento).
6. **ALTO-06:** Reservaciones/venta en línea inexistentes.
7. **MEDIO-07:** sin separación autor/aprobador ni programación de publicación.
8. **MEDIO-08:** artículos/guías y casas de vacaciones sólo preview.
9. **MEDIO-09:** `business_claim_snapshots` y `page_redirects` en 0.

## 17 · Orden mínimo de remediación (paquetes, sin implementar)

- **P1 · Contenido territorial:** zonas, portadas fotográficas y lote real de casas de vacaciones/artículos.
- **P2 · Autoridad de presentación en producción:** poblar modos por entidad y validar degradación.
- **P3 · Piloto controlado del flag** por familia acreditada.
- **P4 · Alux copiloto del concierge** sobre el contrato existente.
- **P5 · Telemetría real** (ingesta activa) antes de declarar monitor.
- **P6 · Workflow (autor≠aprobador, programación).**
- **P7 · Reservaciones y venta en línea** como programa propio.

## 18 · Veredicto

1. CMS alimenta plantillas: **PARCIAL**. 2. Calidad premium: **conservada donde hay datos y foto**. 3. Controles Empresa/Admin: **correctos**. 4. Alux concierge del explorador: **sí, sin tráfico acreditado**. 5. Alux copiloto del concierge humano: **no**. 6. Territorio: **sólo una muestra**. 7. Mi Viaje: **sí, memoria operativa**. 8. Monitor de anónimos: **no**. 9. Etapas completas: 6 de 16. 10. Impide el piloto: BLOQ-01/02/03. 11. Impide declarar sistema completo: reservaciones, telemetría, copiloto de concierge, cobertura territorial. 12. Orden mínimo: P1 → P2 → P3.

**STOP CONDITION respetada:** cero correcciones, cero publicación, flag intacto en `false`.
