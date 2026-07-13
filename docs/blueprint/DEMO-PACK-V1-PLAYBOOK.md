# Demo Pack v1 · Oriente Maya — Playbook

**Estado:** ✅ Sub-olas 1-4 completadas
**Login demo:** `geded@valladolid.com.mx`
**Orden confirmada:** `VMX-DEMO01`

## Recorrido end-to-end (7 pasos)

1. **Descubrimiento** — `/oriente-maya` → explora destinos (Valladolid, Izamal, Espita).
2. **Hoteles** — `/hoteles` → filtrar por Valladolid, abrir "Suite Selva Maya".
3. **Casas de vacaciones** — `/casas-de-vacaciones` (2 casas demo).
4. **Experiencias** — `/experiencias` → "Manglar al amanecer".
5. **Mi viaje** — `/cuenta/mi-viaje` → ver plan activo y orden VMX-DEMO01.
6. **Panel Concierge** — `/cms/travel-plans` (admin).
7. **Comisiones** — `/cms/ventas-en-linea` (admin).

## Validación (Sub-ola 4 · Golden Set)

- Panel: `/cms/demo-pack` → sección "Validación · Golden Set".
- 10 preguntas modelo (9 ES + 1 EN) cubren hospedaje, gastronomía, tours,
  casas de vacaciones, estatus de orden, pueblos mágicos y seguridad.
- Botón **Ejecutar todo** llama al AI Gateway con la misma KB que Alux y
  calcula: score (entidades esperadas presentes), riesgo de alucinación
  (nombres en negritas fuera de la KB) y latencia. Resultado se persiste
  en `alux_evaluations`.

## Retención

**No borrar datos demo** hasta autorización explícita del Founder:
> "Demo validada. Puedes eliminar los datos temporales."
