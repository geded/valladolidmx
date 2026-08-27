# G7-A · Evidencia de Capacidades Premium del Constructor

Fecha efectiva: 2026-08-27
Base: `183e79b6d9e773a46c95cd7017437da1a49fafc8`
Autorización: `PCA-2026-038` + `PCA-2026-038-ADDENDUM-A`
Flag: `omxds_visual_v1_contracts_enabled=false`

## Fixture integrado

Ruta: `/lovable/g4-home-premium-preview` (`noindex,nofollow,noarchive`).
Marcador DOM: `[data-g7-fixture="integrated"]`.

Monta los componentes productivos reales, sin imitaciones, sin persistencia
y sin funciones de escritura:

| Capacidad | Componente productivo | Configuración del fixture |
| --- | --- | --- |
| `vmx.hero` | `src/components/home/Hero.tsx` | `variant: editorial-split`, `media_side: right`, `mobile_order: media-first`, `text_safe_zone: lg` |
| `vmx.discovery.navigator` | `DiscoveryNavigatorBlock` → `DiscoveryNavigator` → `CategoryNavGrid` → `TourismCategoryIcon` | orden manual de 9 slugs (uno inexistente), `hiddenSlugs: restaurantes`, `maxItems: 8` |
| `vmx.alux.planner` | `AluxPlannerBlock` | render-only, 4 sugerencias, CTA `/arma-tu-viaje` |
| `vmx.section.rutas` | `RutasSection` | `source: manual`, 4 slugs (uno inexistente), `max_items: 3`, `show_stops: true` |

## Evidencia visual (seis anchos)

Capturas del fixture: `docs/evidence/omxds-g7/shots/g7-<ancho>.png`.

| Ancho | Overflow horizontal | Hero | Zona segura | Bordados | Orden de categorías | Chips Alux | Rutas / paradas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |
| 430 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |
| 768 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |
| 1024 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |
| 1280 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |
| 1440 px | 0 | `editorial-split` | `lg` | 7 × 44×44 | configurado | ≥44 px | 3 / 3 |

Orden observado en los seis anchos: `cenotes · hoteles · gastronomia ·
zonas-arqueologicas · experiencias · artesanias · cultura`.

## Comprobaciones

- Overflow horizontal 0 en 390/430/768/1024/1280/1440 px.
- Hero editorial dividido: medios a la derecha en escritorio, imagen primero en móvil.
- Zona segura del texto aplicada (`data-hero-safe-zone="lg"`).
- 22 bordados intactos; los 7 renderizados miden 44×44 px exactos (relación 1:1, sin deformación) y declaran `approved-embroidered-artwork-v1`.
- Curaduría fail-closed: `categoria-inexistente` se descarta sin inventar etiqueta ni ícono; `restaurantes` oculta; `maxItems` respetado.
- Sin lista manual, el Navigator conserva la derivación automática.
- Chips y CTA de Alux con altura ≥ 44 px y destino real `/arma-tu-viaje`.
- Selector de rutas en modo local: 3 tarjetas curadas y paradas visibles/ocultables (`data-rutas-stops`); `ruta-inexistente` descartada (fail-closed).
- Foco de teclado visible mediante `ring-focus` en chips, CTA y tarjetas.
- Contraste AA: textos sobre tokens `foreground` / `muted-foreground` del DSL colonial, sin hardcodes de color.
- Cero escrituras: sin mutaciones, sin persistencia, sin publicación de composiciones; consola sin errores en los seis anchos.

## Gates

`test:g7`, `validate:g7`, `validate:g6:s1`, `typecheck`, `lint`, `build`,
`governance:check`, `governance:product-check`, `route-inventory-coverage`
y `sync-governance --check`: PASS.
