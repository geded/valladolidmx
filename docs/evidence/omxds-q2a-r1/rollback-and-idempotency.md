# G8-Q2A-R1 · Rollback e idempotencia (clúster efímero)

**Fecha:** 2026-08-28 · **Ámbito:** exclusivamente el clúster PostgreSQL 17.9 efímero.
**Prohibición acreditada:** cero ejecuciones de rollback contra la base compartida.

## 1. Ciclo probado

| Paso | Resultado |
|---|---|
| `up` Q2A sobre esqueleto mínimo | PASS |
| Reaplicación de Q2A | Aborta en transacción única (objetos ya existentes) · **sin divergencia de schema** |
| `up` Q2A-R1 | PASS |
| Reaplicación de Q2A-R1 | **PASS · idempotente** (huella de schema idéntica) |
| Alta de datos sintéticos (1 destino, 2 lugares, producto, evento, medio, autoridad) | PASS |
| Rollback operativo R1 | PASS · cero lugares perdidos |
| Reaplicación de R1 tras rollback | PASS |
| Rollback operativo Q2A | PASS · cero lugares perdidos, tres políticas históricas restauradas |

## 2. Idempotencia

La huella de schema combina columnas, tipos, `NOT NULL`, políticas con su predicado,
ACL normalizado y `prosecdef` de las funciones de Lugares. Q2A-R1 produce la misma
huella al aplicarse dos veces: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`DROP POLICY IF EXISTS` + `CREATE POLICY`, `DROP FUNCTION IF EXISTS` + `CREATE FUNCTION`
y `REVOKE`/`GRANT` explícitos.

Q2A no es reaplicable literalmente porque contiene `CREATE POLICY` y `CREATE TRIGGER`
sin guarda. Aplicada como transacción única (`psql -1`), la reaplicación **aborta y
revierte por completo**: el schema efectivo posterior es byte-idéntico al anterior.
Es por tanto un **no-op seguro**, no una fuente de divergencia.

## 3. Rollback operativo

- **R1:** elimina `place_products`, `place_events`, las cinco constraints y las seis
  columnas añadidas. No borra lugares ni contenido.
- **Q2A:** elimina las tablas `place_*`, la columna `place_type_id` y restaura las dos
  políticas históricas de escritura desde el snapshot `docs/evidence/omxds-q2a/policy-snapshot.sql`.

Ambos rollbacks son aditivos-inversos: no eliminan tablas históricas ni filas reales.
Tras el uso productivo, el rollback deberá reevaluarse porque ya habría contenido en
las tablas de Lugares; en ese escenario el rollback documentado no borra datos reales
sin autorización expresa.
