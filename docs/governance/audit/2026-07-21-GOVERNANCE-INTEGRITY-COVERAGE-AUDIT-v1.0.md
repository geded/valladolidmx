# Governance Integrity & Coverage Audit v1.0

**Estado:** Ready for review  
**Fecha de corte:** 2026-07-21  
**Base auditada:** `main@bf8ecc33cc478aee0654e8901a01fa45c4ed856e`  
**Alcance:** producto, documentos, rutas, migraciones, plantillas, SEO, dominio web, pruebas, scripts y configuración operativa.

## 1. Dictamen

La gobernanza `00–08` es estructuralmente válida y sus dos proyecciones canónicas pasan sus validadores. El repositorio, sin embargo, no tenía un control automático que demostrara que el inventario siguiera vigente después de su fecha de generación.

Esta auditoría establece la primera línea base verificable y adopta un modelo de **ratchet**: las brechas históricas permanecen visibles, pero ningún PR futuro puede aumentar la deuda de trazabilidad.

## 2. Resultado de la línea base

| Métrica                                        |      Resultado |
| ---------------------------------------------- | -------------: |
| Artefactos relevantes inventariados            |          1,548 |
| Cobertura total por relación exacta o heredada | 1,510 · 97.55% |
| Cobertura exacta por archivo                   |   912 · 58.91% |
| Cobertura heredada por directorio              |            598 |
| Sin relación demostrable                       |             38 |
| Blueprints inventariados en `06`               |     439 de 439 |
| Relaciones válidas en `07`                     |          1,116 |
| Relaciones semánticas válidas en `08`          |          1,625 |

La cobertura heredada significa que un directorio está relacionado con un documento, pero el archivo individual no tiene un nodo exacto. Sirve como evidencia de pertenencia; no es suficiente para admitir automáticamente artefactos nuevos.

## 3. Cobertura de las áreas críticas

| Área                               | Total | Exacta | Heredada | Sin cobertura | Dictamen                             |
| ---------------------------------- | ----: | -----: | -------: | ------------: | ------------------------------------ |
| Blueprints                         |   439 |    439 |        0 |             0 | Completa                             |
| SEO técnico                        |     6 |      6 |        0 |             0 | Completa en repositorio              |
| Configuración de dominio/canonical |     3 |      3 |        0 |             0 | Completa en repositorio              |
| Plantillas y superficies           |    86 |     48 |       38 |             0 | Completa, pero 44.2% heredada        |
| Rutas                              |   187 |    100 |       87 |             0 | Completa, pero 46.5% heredada        |
| Migraciones                        |   199 |      4 |      195 |             0 | Débil a nivel individual             |
| Componentes                        |   268 |    104 |      164 |             0 | Cobertura principalmente por familia |
| Módulos                            |   290 |    181 |      106 |             3 | Parcial                              |
| Pruebas                            |    18 |     15 |        0 |             3 | Parcial                              |
| Scripts                            |    30 |      8 |        8 |            14 | Parcial                              |

## 4. Hallazgos dirigidos

### SEO

Los artefactos técnicos principales —configuración única del sitio, metadata, canonical, structured data, sitemap, robots, `llms.txt` y manifest— tienen relación exacta. Esto prueba cobertura documental en el repositorio, no certificación externa.

Continúan fuera del alcance automático local: DNS, certificados, redirecciones en el proveedor, Search Console, Bing Webmaster Tools, Rich Results, hreflang real, indexación, tráfico y autoridad de cada dominio.

### Dominios

Los 14 dominios `D01–D14` son dominios documentales. No equivalen a dominios web.

La fuente técnica única sigue en `src/config/site.ts` y actualmente declara `quehacerenvalladolid.com` como dominio público. La migración definitiva a `valladolid.mx` requiere su propia certificación operativa y SEO; esta auditoría impide que ese cambio ocurra sin evidencia documental.

### Plantillas

Surface Kit, Experience Builder, superficies y plantillas de correo están detectados. Cualquier plantilla nueva deberá tener nodo exacto y relación documental en `07/08`; pertenecer sólo a una carpeta ya no bastará.

### Migraciones

Existen 199 migraciones. Sólo cuatro poseen nodo exacto; 195 heredan cobertura por directorio. Es la deuda de trazabilidad más importante.

A partir de este control:

- una migración nueva debe tener trazabilidad exacta;
- una migración existente no puede modificarse, renombrarse o eliminarse;
- el historial previo queda visible como deuda heredada y debe cerrarse por lotes, sin bloquear retrospectivamente el producto.

## 5. Control automático incorporado

El workflow `Governance Integrity` se ejecuta en cada PR y en cada push a `main`.

Valida:

1. integridad estructural de `07`;
2. integridad semántica de `08`;
3. coincidencia exacta entre repositorio e inventario por ruta, clase y SHA-256;
4. correspondencia bidireccional entre `docs/blueprint/` y `06`;
5. trazabilidad exacta de todo artefacto nuevo;
6. inmutabilidad del historial de migraciones;
7. evidencia documental para cambios en SEO, dominio, plantillas y workflows;
8. evidencia para eliminaciones o renombres de artefactos gobernados.

El job publica un resumen con totales, cobertura exacta, cobertura heredada, brechas y errores accionables.

## 6. Política de actualización

Cuando un PR agregue o cambie artefactos relevantes:

1. actualizar el Blueprint, ADR o reporte de evidencia correspondiente;
2. incorporar Blueprints nuevos a `06`;
3. actualizar `07` y `08` cuando exista una ruta técnica nueva;
4. regenerar `GOVERNANCE-ARTIFACT-INVENTORY.json` desde el mismo commit;
5. ejecutar `bun run governance:validate`.

Actualizar únicamente la huella digital no corrige una falta de trazabilidad. Los artefactos nuevos deben tener cobertura exacta.

## 7. Riesgo residual y siguiente cierre

Esta automatización certifica frescura e integridad dentro del repositorio. No sustituye verificaciones externas de producción.

Prioridad recomendada para elevar la cobertura exacta:

1. registrar individualmente las 195 migraciones heredadas;
2. convertir las 38 plantillas con cobertura heredada en relaciones exactas;
3. completar las 87 rutas heredadas;
4. resolver los 38 artefactos sin cobertura;
5. agregar una certificación externa programada para SEO y dominios.

## 8. Criterio de aceptación

El control queda aceptable para integración cuando los tres validadores devuelvan `PASS`, el inventario coincida con el árbol del PR y el workflow pueda ejecutarse sin permisos de escritura ni secretos.
