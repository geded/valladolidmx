# G8-R1-F1H · Piloto público navegable con corpus real v1.0

- Estado: `Approved`
- Fecha: 2026-08-30
- Autoridad: Autorización Founder G8-R1-F1H (continuación del cierre G8-R1-F1G)
- Flag visual global: `omxds_visual_v1_contracts_enabled = false` (OFF, sin cambios)
- Dominio primario: `D04 · content-experience`

## 1. Reconciliación previa 23 → 22

La matriz `2026-08-30-G8-R1-F1G-EVALUATION-CONTENT-MATRIX-v1.0.md` clasificó 23 fichas
como Clase A (convertibles). La conversión acreditó 22.

**Entidad número 23: `taberna-de-los-frailes` (empresa · Valladolid · restaurantes).**

Durante la verificación documental de G8-R1-F1G no se pudo confirmar existencia
operativa ni fuente oficial vigente (resultado `NO_ENCONTRADO`, posible cierre).
Al no existir procedencia acreditable, no se convirtió en real y permanece dentro
del lote interno `G8-R1-F1G-EVALUATION-CONTENT` como demo. No participa en el
piloto. La diferencia 23 → 22 queda explicada y cerrada.

## 2. Allowlist exacta del piloto

Autoridad única: `src/lib/omxds/pilot-allowlist.ts` (`PILOT_ID = G8-R1-F1H-PUBLIC-PILOT`).
Contiene exactamente 22 entidades con id, familia, slug, destino, ruta canónica,
presentación acreditada, portada y procedencia.

| Familia  | Total | Entidades                                                                                                                 |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| Destino  | 6     | Izamal · Espita · Ek Balam · Río Lagartos · Las Coloradas · Uayma                                                          |
| Lugar    | 5     | Ex Convento de San Bernardino · Calzada de los Frailes · Cenote Zací · Cenote Suytun · Cenote Ik Kil (Tinum)               |
| Empresa  | 7     | Conato 1910 · Yerbabuena del Sisal · Hotel Casa Tía Micha · Coqui Coqui · Zazil Tunich · Restaurante Kinich · Macan Ché    |
| Producto | 4     | Nado en el Cenote Sagrado · Recorrido Cenote Museo · Ceremonia Maya · Cena Romántica en Cenote (todos de Zazil Tunich)     |

Ninguna entidad demo entra a la allowlist. La lista es inmutable en código: cualquier
cambio exige autorización Founder explícita.

## 3. Publicación navegable controlada

- Las 22 entidades responden **HTTP 200** en sus rutas públicas definitivas del
  modelo canónico `/oriente-maya/:destino[/:categoria/:empresa[/:producto]]` y
  `/oriente-maya/:destino/lugares/:lugar`.
- Las 22 emiten `noindex, nofollow` mientras dura la revisión Founder.
- Ninguna entra en `sitemap.xml`.
- El flag `omxds_visual_v1_contracts_enabled` permanece en **OFF**.

Correcciones incorporadas en esta ola:

1. La ficha de Lugar no aplicaba el aislamiento del lote: ahora consulta la
   membresía y emite `noindex, nofollow` (5 lugares corregidos).
2. El sitemap incluía plantillas internas (`__tpl_*`) y no respetaba
   `robots_directive`. Ambas exclusiones se aplican: 23 → 17 URLs.
3. La composición `p/biz-zazil-tunich` queda marcada `noindex,nofollow`.

## 4. Presentación

Las 22 entidades carecen de portada aprobada G8-M1, por lo que la autoridad de
presentación resuelve **Editorial** para todas ellas de forma determinista. Cero
modo Cinematográfico activado, cero fotografía de terceros, cero marcador
sustituto que simule fotografía propia.

## 5. Precios y acciones

Ningún producto del piloto tiene precio ni disponibilidad acreditados; no se
muestran importes ni acciones de compra. Las acciones se limitan a explorar,
guardar y planear. Cero checkout, cero pagos, cero reservación.

## 6. Alux

El catálogo canónico que consume Alux pasa de excluir el lote completo a excluir
corpus demo (`is_demo_seed`), incorporando las 22 entidades reales acreditadas y
manteniendo fuera todo lo demo. Alux no inventa precios, horarios ni servicios.

## 7. Corpus retirado

- 12 fichas retiradas a borrador en G8-R1-F1G: ausentes.
- 10 eventos archivados: ausentes.
- 9 fichas Clase B / no verificadas (8 empresas + 1 producto, incluida
  `taberna-de-los-frailes`) que seguían publicadas: **retiradas a borrador de
  forma reversible** con bitácora en `content_audit_log`
  (`g8_r1_f1h_withdraw_class_b`, estado previo registrado).

Verificación de fuga: 0 apariciones de los 9 slugs demo en Home, portada de
Oriente Maya, destino, listados y las 22 fichas, en los tres anchos auditados.

## 8. Observación fuera de alcance (pendiente de decisión Founder)

Tres empresas `owner_submitted` con `source_review_state = unreviewed` continúan
publicadas fuera del lote y por tanto siguen en sitemap:
`hacienda-san-servacio-boutique`, `cocina-del-frailes`, `ruta-cenotes-y-selva`.
No son demo y no estaban cubiertas por esta autorización, por lo que **no se
modificaron**. Se reportan para decisión Founder.

## 9. QA pública

81 verificaciones (27 URLs × 390 / 768 / 1440 px):

- HTTP 200: 81/81
- Overflow horizontal: 0 en todos los casos
- Errores de consola: 0
- Fuga de corpus demo: 0

Defecto corregido durante la QA: la subnavegación de experiencia (`ExperienceSubnav`)
desbordaba horizontalmente en 390 y 768 px al perder el desplazamiento horizontal
por encima de `sm`. Ahora conserva scroll horizontal y sólo envuelve en `lg`.

Evidencia: `docs/governance/evidence/g8-r1-f1h-public-pilot.json`.

## 10. Rollback

1. Restaurar `status = 'published'` en las 9 fichas retiradas leyendo
   `content_audit_log` (`action = 'g8_r1_f1h_withdraw_class_b'`).
2. Revertir `page_compositions.robots_directive` de `biz-zazil-tunich` a
   `index,follow`.
3. Revertir los cuatro archivos de código de la ola.

Cero borrado físico. Cero cambio de fechas. Flag global sin alterar.

## 11. Gates

| Gate                      | Resultado |
| ------------------------- | --------- |
| `bun run typecheck`       | PASS      |
| `bun run governance:check`| PASS      |
| QA responsiva 390/768/1440| PASS      |
| Aislamiento demo          | PASS      |
| Flag OFF                  | PASS      |

## 12. Estado

`noindex, nofollow` se mantiene en las 22 fichas hasta revisión y autorización
expresa del Founder. Sin publicidad, sin indexación, sin activación del flag.
