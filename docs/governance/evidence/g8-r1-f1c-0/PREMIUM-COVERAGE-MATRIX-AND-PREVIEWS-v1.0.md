# G8-R1-F1C-0 · Cobertura Premium Restante — Preflight y Aprobación Visual

**Estado:** entregado · read-only + previews internos noindex
**Flag productivo:** `false` · sin rutas productivas conectadas · sin datos, sitemap, redirects ni autoasignaciones.

---

## 1 · Matriz de las seis familias (Fase 0 · diagnóstico read-only)

| # | Familia | Modelo/Tabla | CMS | Ruta pública | Loader | Superficie estándar | Adaptador | Preset | Exp. Builder | Medios | SEO/JSON-LD | Alux | Guardar / Mi Viaje | Reclamación | Sitemap | Autoridad visual | Contenido real | **Estado** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Casa de vacaciones | `businesses` (+`business_hours`, `business_locations`) | `/cms/empresas` | `/oriente-maya/$destino/$categoria/$empresa` | sí | `BusinessSurface` | `vacation-rental-surface.adapter` | `premium-entity-vacation-rental` (pendiente aceptación) | sí | pipeline G8-M1 | `VacationRental` | sí | sí | sí (discreta) | no | `/lovable/g8p2-vacation-rental-premium-preview` | 0 fichas | **PREVIEW-ONLY** |
| B | Empresa turística genérica | `businesses` + `business_categories` | `/cms/empresas` | ruta canónica de empresa | sí | `BusinessSurface` | — (falta adaptador genérico por categoría) | — | sí | pipeline G8-M1 | `LocalBusiness` básico | sí | sí | sí (discreta) | no | **nuevo** `/lovable/g8-r1f1c-business-generic-preview` | 15 fichas B1-B4 (draft) | **PARCIAL** |
| C | Producto genérico | `products` (`product_type`, `conversion_mode`) | `/cms/productos` | `/producto/$slug` y ruta anidada | sí | `ProductSurface` | — (falta adaptador genérico) | — | sí | pipeline G8-M1 | `Product` sin `offers` | sí | sí | n/a | no | **nuevo** `/lovable/g8-r1f1c-product-generic-preview` | 0 reales | **PARCIAL** |
| D | Zona territorial | `destination_zones` (+`destination_zone_media`) | `/cms/zonas` | **inexistente** | — | — | — | — | no | pipeline G8-M1 | — | parcial | — | n/a | no | **nuevo** `/lovable/g8-r1f1c-zone-preview` | zonas cargadas sin narrativa | **REQUIERE MODELO/CMS (ruta pública)** |
| E | Ruta / itinerario | `editorial_routes` | sin editor dedicado | **inexistente** | — | — | — | — | no | pipeline G8-M1 | — | no | no | n/a | no | **nuevo** `/lovable/g8-r1f1c-route-preview` | 0 rutas | **REQUIERE MODELO/CMS** |
| F | Artículo / guía editorial | `articles` | sin editor dedicado | `/blog` índice (`noindex, follow`), sin `/blog/$slug` | parcial | — | — | — | no | pipeline G8-M1 | `CollectionPage` sólo índice | no | no | n/a | no (retirado) | **nuevo** `/lovable/g8-r1f1c-article-preview` | 0 artículos | **REQUIERE MODELO/CMS** |

Ninguna familia se reconstruyó: A ya contaba con preview acreditado y se reutiliza tal cual.

---

## 2 · Brechas de modelo / CMS

- **B** · falta adaptador de composición por categoría (artesanías, comercio, agencia, transporte, operador, servicio, visitable) y omisión declarativa de bloques vacíos.
- **C** · falta adaptador genérico con modo de conversión único (comprar / contactar / reservar) y regla fail-closed de precio-stock.
- **D** · `destination_zones` existe y tiene CMS, pero **no hay ruta pública, loader, superficie ni canónico**; requiere decisión de patrón de URL dependiente del destino.
- **E** · `editorial_routes` sin editor, sin etapas ordenadas modeladas (lugares/productos/eventos por etapa), sin ruta pública.
- **F** · `articles` sin editor editorial, sin autor/fuentes modelados, sin `/blog/$slug`, sin imagen editorial gobernada.

---

## 3 · Autoridad visual reutilizada (Fase 1)

DSL colonial aprobado (`src/styles.css @theme`), `PublicShell`/Surface Kit, primitivas `PremiumHero`, `PremiumSection`, `PremiumTerritorialBreadcrumb`, `PremiumPresentationControl`, patrones Home/Destination G4, Listing G5, Hotel/Restaurant/Event/Experience/Tour, Place Q2D, Landing SEO acreditada y activos canónicos de Alux. **No se creó estética nueva.**

Sin fotografía aprobada: **marcador neutral**, cero imagen heredada y variante Cinematográfica **fail-closed** cuando depende de portada (todas las familias nuevas arrancan en Editorial).

---

## 4 · Previews internos entregados (Fase 2)

| Familia | Ruta interna (noindex,nofollow,noarchive) |
|---|---|
| A · Casa de vacaciones | `/lovable/g8p2-vacation-rental-premium-preview` (existente) |
| B · Empresa turística genérica | `/lovable/g8-r1f1c-business-generic-preview` |
| C · Producto genérico | `/lovable/g8-r1f1c-product-generic-preview` |
| D · Zona territorial | `/lovable/g8-r1f1c-zone-preview` |
| E · Ruta / itinerario | `/lovable/g8-r1f1c-route-preview` |
| F · Artículo / guía editorial | `/lovable/g8-r1f1c-article-preview` |

### Campos por familia

- **A** propiedad completa/unidad, capacidad, dormitorios, camas, baños, cocina, amenidades, reglas, estancia mínima, check-in/out, ubicación aproximada, anfitrión, disponibilidad sólo con integración, contacto/reserva, `VacationRental`.
- **B** territorio, categoría, atención, horarios (omitidos si no acreditados), contacto, estado de ficha, bloques por categoría, `LocalBusiness`.
- **C** proveedor, categoría, precio/stock (omitidos, nunca inventados), modo de conversión único, `Product` sin `offers`.
- **D** breadcrumb Inicio → Oriente Maya → Destino → Zona, descripción territorial, mapa, lugares, empresas, productos, eventos, rutas, Alux, "Explorar destinos del Oriente Maya", `TouristDestination` con `containedInPlace`.
- **E** título, territorio, duración, etapas ordenadas, mapa, recomendaciones prácticas, accesibilidad, origen editorial, "Agregar ruta a Mi Viaje", `TouristTrip` + `ItemList` sin reservas inventadas.
- **F** autor, fecha, standfirst, cuerpo, fuentes, relacionados, Mi Viaje, Alux, CTA turísticos secundarios, `Article`.

---

## 5 · Paridad (Fase 3)

Verificado por preview: fuente CMS prevista declarada; medios vía pipeline G8-M1 (ningún preview embebe fotografía de terceros); ALT/crédito obligatorios cuando exista medio gobernado; contexto Alux disponible (dock único); Guardar/Mi Viaje presente en A, C, D, E, F y en B como acción secundaria; territorialidad en breadcrumb canónico; reclamación discreta sólo al pie en A y B; SEO/JSON-LD por familia; omisión por vacío explícita; un solo header/footer y un solo dock/planner; responsive y accesibilidad con listas semánticas, `dl/dt/dd`, `ol` numerada e iconos `aria-hidden`.

## 6 · QA visual (Fase 4)

Playwright 390 px y 768 px sobre las seis rutas: **overflow horizontal 0** y **consola sin errores** en los 12 escenarios. Sin fotos de terceros y todo dato demo rotulado "(demo interna)".

---

## 7 · Recomendación de implementación (orden)

1. **Comerciales esenciales** — B (adaptador genérico por categoría) → C (adaptador genérico + conversión única) → A (aceptación del preset ya existente).
2. **Territoriales** — D: ruta pública de zona dependiente del destino, loader, superficie y canónico no competitivo.
3. **Editoriales** — E (modelo de etapas + CMS de rutas) → F (`/blog/$slug`, autor/fuentes, imagen editorial gobernada).

## STOP CONDITION

Entrega detenida tras los previews. No se conectaron rutas productivas ni se implementaron modelos faltantes. Flag en `false`. Se espera aprobación visual del Founder.
