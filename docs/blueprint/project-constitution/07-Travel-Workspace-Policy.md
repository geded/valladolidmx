# 07 · Travel Workspace Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `11.3-TRAVEL-PLANS-CONCIERGE.md`, `15.10.5c.1-CUENTA-MIGRATION.md`, Sub-olas C/D/E/F/G/H (Arma tu Viaje ↔ Alux Traveler ↔ Concierge), memoria Core.

---

## 1. Vocabulario oficial

| Término | Significado |
|---|---|
| **Arma tu Viaje** | Funcionalidad pública de descubrimiento y planificación. |
| **Agregar a Mi Viaje** | Acción universal disponible desde cualquier card/entidad. |
| **Mi Viaje** | Workspace personal del viajero autenticado. URL canónica: `/cuenta/mi-viaje`. |
| **Travel Workspace** | Fuente única de contexto del viajero para todos los sistemas. |

## 2. Fuente única de contexto

El **Travel Workspace** es la fuente única de contexto para:

- Alux (Traveler y Concierge);
- Concierge humano;
- reservas futuras;
- aplicaciones móviles;
- integraciones externas.

Modelo canónico: `travel_plans` + `travel_plan_items` + `travel_plan_build_snapshot` + `traveler_profiles`.

## 3. No crear un segundo modelo de viaje

Prohibido crear un segundo modelo de viaje, un segundo snapshot o una segunda base de contexto.

## 4. Favoritos vs Mi Viaje

- **Favoritos** complementa. Guardado ligero, sin estructura.
- **Mi Viaje** estructura. Plan con ítems, días, notas, snapshot y handoff a Concierge.

No se separan como sistemas independientes: Favoritos alimenta a Mi Viaje mediante "Agregar a Mi Viaje".

## 5. Handoff único al Concierge

La única puerta de entrada al Concierge desde el Travel Workspace es:

```
promotePlanToCase({ planId, summary })
```

Snapshot completo, `concierge_case_links` poblado, plan marcado `shared_with_concierge`, `case_id` vinculado. No se duplican modelos.

## 6. Alux ↔ Travel Workspace

Alux Traveler consume el Travel Workspace vía `traveler_alux_context_for_user()` (RPC `SECURITY DEFINER`). Sin lecturas directas de tablas. Alux nunca modifica el plan sin confirmación (ver Política 06).

---

## Regla operativa

**Un solo modelo de viaje. Una sola acción "Agregar a Mi Viaje". Una sola puerta al Concierge.**

---

## Conflictos pendientes de decisión del Founder

- **URL canónica del Workspace del viajero:** vigente `/cuenta/mi-viaje`; `/mi-viaje` conservado como redirect. Sin conflicto activo.