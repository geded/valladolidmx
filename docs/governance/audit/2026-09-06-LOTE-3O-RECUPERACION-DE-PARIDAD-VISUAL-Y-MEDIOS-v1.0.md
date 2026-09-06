# Lote 3O · Recuperación de paridad visual y medios

Fecha: 2026-09-06  
Estado: Validación canónica local completa; validación visual remota pendiente

## Alcance autorizado

Recuperar la presentación pública ya aprobada para Home, Oriente Maya y listados
globales; conservar los activos gobernados existentes y sus créditos; corregir
regresiones de carga, responsive, contexto territorial y fallback visual. No se
generan activos nuevos, no se sustituyen créditos y no se escriben datos.

## Diagnóstico verificable

- main contiene los commits de implementación anteriores: la fusión del PR #60
  no eliminó el historial trabajado.
- Home podía resolver a contenido vacío cuando fallaba una sola de sus fuentes,
  porque destinos, empresas, productos, eventos y mapa compartían un único
  Promise.all.
- Los listados globales podían heredar el destino visitado previamente, aunque la
  consulta y la URL fueran globales.
- que-hacer todavía tomaba la superficie histórica y los fallbacks de imagen no
  distinguían correctamente la vertical.
- La cabecera regional conservaba un bloque verde que no coincidía con la
  autoridad visual Home Premium.
- El commit remoto posterior al PR #60 no está fusionado y contiene un inventario
  Governance ilegible; no se toma como autoridad funcional.

## Recuperación aplicada

- Resolución independiente por fuente en Home con degradación parcial.
- Uso exclusivo de medios gobernados ya existentes por vertical; se preservan
  autoría y créditos.
- Superficie Premium compartida para que-hacer y acciones de viaje/favorito.
- Fallbacks separados para hospedaje, gastronomía, eventos y contenido editorial.
- Contexto territorial explícito en listados globales para impedir breadcrumbs
  heredados obsoletos.
- Cabecera regional alineada con la autoridad visual clara y altura responsive
  recuperada.
- PCA y addenda exactos por ruta y SHA-256, sin comodines ni revisiones futuras.

## Controles

| Control                           | Resultado                                                               |
| --------------------------------- | ----------------------------------------------------------------------- |
| TypeScript --noEmit               | PASS                                                                    |
| Contrato Premium focalizado       | PASS · 14/14                                                            |
| Product Change Authorization Gate | PASS · 14/14 rutas sensibles autorizadas                                |
| Suite canónica completa           | PASS                                                                    |
| Responsive 1440/834/430/390       | Pendiente                                                               |
| HTTP preview expirado             | PASS · 404                                                              |
| Smoke HTTP local                  | PASS en 9 rutas; rutas requiere credencial de servicio ausente en local |
| GitHub requerido                  | Pendiente                                                               |

## Restricciones preservadas

Sin generación de imágenes, sin modificación o ejecución de migraciones, sin
escrituras de datos, pagos, reservaciones, mapas, cron, secretos o RLS. La
publicación y el despliegue permanecen condicionados a PASS total y cero P0/P1.

## Addendum · reconciliación Premium y rutas territoriales

La autorización PCA-2026-067 reconcilia sin rediseño las autoridades visuales
Premium de Home y destino. Constructor, preview y ruta pública consumen el mismo
renderer; el breadcrumb permanece visible en tablet; los espacios editoriales sin
medio publicable se omiten en vez de dibujar un contenedor vacío.

La fuente de rutas deja de sintetizar recorridos desde destinos y consume sólo
rutas editoriales publicadas del CMS. La relación territorial se deriva del
destino de origen, destinos vinculados y paradas acreditadas. Las fichas priorizan
rutas locales y ofrecen recorridos publicados de destinos cercanos como
continuidad regional. La apertura de una ruta emite únicamente la afinidad
temporal y consentida `route:<slug>` para Alux, sin PII ni mutación del viaje.

Revisiones sensibles acreditadas exactamente:

- `src/lib/experience-builder/blocks/home-premium-g4/contract.ts`
- `src/lib/experience-builder/smart-blocks.server.ts`

Se preservan el flag `omxds_visual_v1_contracts_enabled=false`, la marca vigente,
la rama de integración y las prohibiciones de despliegue, publicación, datos,
migraciones, pagos, reservaciones, secretos, cron y RLS.
