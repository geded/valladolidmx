# Estándar Único de Construcción del CMS (Studio Standard v1.0)

## Qué resuelve

Hoy Inicio y la landing de Zazil Tunich ya se editan con el mismo motor
(seleccionar sección, editar textos/imágenes/enlaces, arrastrar y pegar,
guardar con bloqueo y auditoría). Pero cada plantilla se habilitó a mano.

La propuesta convierte ese trabajo en un **estándar obligatorio**: cualquier
plantilla presente o futura queda editable, con Alux y con visibilidad
comercial, sólo por declararlo — sin volver a programar el editor.

No se rediseña ninguna plantilla aprobada. No se crea un segundo constructor.

**Alcance, en corto:** sí, al completarse las etapas, las plantillas que ya
existen quedan editables con el mismo comportamiento de Inicio: seleccionar
cada sección, cambiar textos, imágenes, botones y enlaces, y arrastrar y pegar
para reacomodar. Con dos límites deliberados: sólo es editable lo que la
plantilla declara editable (la maqueta aprobada y su marca quedan protegidas),
y las secciones fijas por diseño — portada, distintivos institucionales,
cierre — no se arrastran. La adopción es plantilla por plantilla (etapa E5),
con tu validación visual entre cada una, no un cambio masivo en un solo paso.

## El estándar: 5 declaraciones por plantilla

Cada plantilla oficial declara, en los registros que ya existen:

1. **Secciones** — qué partes tiene, su nombre visible, su interruptor de
   visibilidad y si se puede reordenar.
2. **Campos editables** — qué textos, imágenes, botones y enlaces se pueden
   cambiar en cada sección (lo demás queda protegido).
3. **Contenido del CMS** — de qué catálogo real se alimenta cada carril
   (destinos, rutas, experiencias, hospedaje, restaurantes, eventos, productos).
4. **Señales para Alux** — qué intención de viaje representa cada sección, para
   que Alux entienda y recomiende sobre esa superficie.
5. **Espacios de visibilidad** — qué carriles admiten presencia contratada de
   empresas o productos, y cuántos espacios.

Una plantilla sin estas declaraciones sigue funcionando exactamente como hoy
(fail-closed): no se rompe nada, sólo no obtiene las capacidades nuevas.

## Cómo queda Alux dentro del estándar

Cada sección declarada aporta contexto: dónde está el visitante, qué está
mirando, qué destino y categoría, qué fichas se le mostraron. Alux consume ese
contexto por el registro existente, no por código propio de cada plantilla.
Resultado: Alux responde igual de bien en Inicio, en un destino, en un listado
y en la landing de una empresa, sin trabajo adicional por página.

## Cómo queda la visibilidad dentro del estándar

Las reglas ya aprobadas (1 espacio contratado por cada 4 tarjetas, el primero
del bloque, máximo 1 aparición por carril y 2 por página, rotación diaria
determinista, sin huecos ni contenido inventado) se aplican automáticamente a
todo carril que declare espacios comerciales. Si mueves o reordenas una sección
en el constructor, los espacios contratados viajan con ella y se recalculan en
su nueva posición. Si no hay empresa elegible, el lugar lo ocupa contenido
orgánico.

## Etapas de entrega

**E1 · Contrato del estándar.** Formalizar las 5 declaraciones sobre los
registros existentes (`composite-sections`, `editorial-builder-policy`,
`official-template-structure`) + verificador que lista qué plantilla cumple qué.
Sin cambio visual.

**E2 · Puente genérico de edición.** Extraer el puente que hoy funciona en
Inicio y en la landing para que cualquier plantilla declarada obtenga
selección, inspector, medios, enlaces y arrastrar/pegar. Sin cambio visual.

**E3 · Alux por declaración.** Conectar el contexto de sección al registro de
Alux ya existente.

**E4 · Visibilidad por declaración.** Conectar los carriles declarados al
reparto comercial ya aprobado, respetando el orden editado.

**E5 · Adopción plantilla por plantilla.** Destinos, listados turísticos,
fichas y landings, una a la vez, con comparación antes/después en 1440 / 834 /
430 / 390 y validación visual tuya entre cada una.

**E6 · Regla permanente.** Ninguna plantilla nueva se considera terminada sin
las 5 declaraciones. Se verifica automáticamente.

## Detalle técnico

- Registros tocados: `src/lib/experience-builder/composite-sections.ts`
  (añade `cmsSource`, `aluxIntent`, `commercialSlots` por sección),
  `editorial-builder-policy.ts` (campos escribibles), `official-template-structure.ts`.
- Puente de edición: generalizar lo hecho en `VisualStudio.tsx` +
  `composition-renderer.tsx` (`seoLandingSlotOf`, `SEO_LANDING_REORDERABLE_SLOTS`,
  puente de carriles de `home-premium-real.ts`) a un resolvedor por plantilla.
- Alux: `src/lib/workspace/alux-registry.ts` y `src/lib/alux/unified-context.ts`.
- Visibilidad: `src/lib/visibility/commercial-slots.ts` y
  `effective-visibility.functions.ts`, sin cambiar sus reglas.
- Renderer público, contenido CMS, contratos Zod, RLS, pagos y navegación
  permanecen invariantes. Todo guardado sigue por `eb_save_composition_draft`
  con bloqueo, hash y auditoría.
- Cada etapa cierra con typecheck, pruebas de contrato, Preservation Gate y
  Completion Report.

## Qué NO incluye

Rediseño de plantillas, editores paralelos, migraciones de datos reales,
cambios de precios o paquetes de visibilidad, y publicación automática.
