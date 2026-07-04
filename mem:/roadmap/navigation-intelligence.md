---
name: Navigation Intelligence (épica futura)
description: Evolución multidimensional del Navigation Blueprint — motivacional, temporal, perfil del visitante. Fuera de alcance actual.
type: feature
---

**Estado:** Backlog estratégico (aprobado 2026-07-04). NO implementar hasta cerrar Carril A y estabilizar navegación territorial (N1..N9).

**Alcance:** Evolucionar la navegación pública desde territorial hacia multidimensional combinando:
- **Territorial** (v1.0 oficial): Región → Destino → Categoría → Empresa → Producto.
- **Motivacional** (futura): Romance, Familia, Aventura, Gastronomía, Cultura, Naturaleza, Lujo, Bienestar, Fotografía, Religioso, Negocios, Accesibilidad.
- **Temporal** (futura): Hoy, esta noche, fin de semana, abierto ahora, próximos eventos, temporada, clima, duración.
- **Perfil** (futura): Pareja, familia, viajero solo, extranjero, grupo, accesibilidad.

**Reglas vinculantes:**
- Ninguna sustituye a la territorial: la complementan.
- Reutilizan Navigation Contract (`src/lib/navigation`), Context Engine y Discovery Layer. Prohibido crear motores paralelos (Infrastructure Freeze).
- Rutas canónicas territoriales primero; motivacional/temporal como facetas (`?motivo=`, `?cuando=`) o landings curadas (`/motivos/:slug`, `/momentos/:slug`).
- El contrato `NavigationContext` ya declara `motivation?`, `temporal?`, `profile?` desde v1.0 para evitar refactor de firmas cuando se abra la épica.

**Meta producto:** Convertir Valladolid.mx desde portal informativo hacia plataforma inteligente de descubrimiento turístico.

**Documento fuente:** `docs/blueprint/15.11-NAVIGATION-BLUEPRINT-v1.0.md` §16 (Addendum).