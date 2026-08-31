# G8-R1-F1L · Integración pública del runtime Premium v1.0

**Estado:** Approved  
**Autoridad:** instrucción Founder del 2026-08-31 para integrar en la sección
pública las plantillas y los medios reales previamente creados y aprobados,
conforme a la documentación y sin reintroducir demos.  
**Instrumento:** PCA-2026-060  
**Base:** main@e23ac62134ef8acad937525c337158f8d47007b5

## 1. Objetivo cerrado

Completar la conexión productiva ya prevista por el runbook P0–P4, sin crear
una segunda plantilla ni una segunda fuente de contenido:

1. La Home Premium publicada consume las portadas reales acreditadas que ya
   están asociadas a destinos, empresas y productos.
2. El hero y las tarjetas de rutas de la Home reutilizan esos mismos medios;
   no contienen fixtures ni rutas de archivo inventadas.
3. Experiencia y Tour adoptan su preset aprobado tanto en /producto/{slug}
   como en la URL territorial canónica, aun con el flag global en OFF.
4. Hoteles, restaurantes, destinos y los seis listados conservan sus
   conexiones ya vigentes; no se modifica su implementación.

## 2. Fuente única de medios

media_assets sigue siendo la autoridad. El resolutor sólo admite activos que
cumplan simultáneamente la política acreditada G8-M1: publicado, aprobado,
pipeline listo, no eliminado, no demo/IA/fixture, checksum, ALT, crédito y
derechos declarados. La URL que entrega al navegador es exclusivamente
/api/public/studio-media/{storage_path}, contrato estable ya existente.

Queda prohibido crear, sustituir, mover, renombrar o volver a cargar medios en
esta integración. El proxy existente conserva la firma del bucket privado al
momento de servir el objeto.

## 3. Familias públicas incluidas y bloqueadas

| Familia | Resultado |
| --- | --- |
| Home rev.33 | Premium con corpus real y medios acreditados |
| Destino (7 del piloto) | Conserva Premium existente |
| Hotel / Restaurante | Conserva preset Premium existente |
| Experiencia / Tour | Preset Premium en ambas rutas canónicas |
| Seis listados | Conservan renderer Premium productivo |
| Evento | Bloqueado: sin contenido real acreditado para el piloto |
| Casa de vacaciones | Bloqueada: autoAssign=false, pendiente aceptación Founder |
| Producto/empresa genéricos | Superficie estándar fail-closed |
| Lugar | Sin alta de datos nuevos; conserva comportamiento vigente |

## 4. Cambios exactos

- src/lib/experience-builder/smart-blocks.server.ts
- src/components/home-premium/home-premium-real.ts
- src/routes/producto.$slug.tsx
- src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx
- scripts/omxds/r1-f1l-r2/premium-runtime-connection.contract.test.ts
- scripts/omxds/i3/product-experience-event-surfaces.evidence.mjs

No hay migraciones, mutaciones de datos, cambios de medios, dependencias,
flags, robots, sitemap, canónicas ni rutas nuevas.

## 5. Aceptación y rollback

- Home, rutas y tarjetas reciben URLs públicas estables acreditadas.
- Cero dependencia de SUPABASE_SERVICE_ROLE_KEY para resolver el DTO de Home.
- Experiencia/Tour Premium con flag global OFF en ambas URL existentes.
- Secciones sin datos o medios acreditados permanecen vacías/Editoriales.
- Rollback: revertir este único commit; los datos y medios no requieren rollback.

Gates: bun run test:r1:f1l:r2, bun run test:r1:f1l:p0, bun run lint,
bun run typecheck, bun run build, bun run governance:check y
bun run governance:product-check.
