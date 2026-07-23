# I1 · Adenda excepcional temporal de dependencia DOM

**Estado:** Approved — Founder  
**Fecha:** 2026-07-23  
**Alcance:** validación operativa final de I1  
**SHA de producto bajo prueba:** `21ac5ddd7e4caafe1fa916ee7962acc2e2204339`

## Decisión vinculante

Se modifica exclusivamente la restricción de la sección 5.1 de
`docs/blueprint/18.25-OMXDS-V1-I1-IMPLEMENTATION-AUTHORIZATION-PACK-v1.0.md`
para permitir Playwright `1.55.0` únicamente dentro de un runner efímero de
GitHub Actions.

Playwright no se incorpora a `package.json` ni a `bun.lock`. La instalación
ocurre bajo `RUNNER_TEMP` y se destruye con el runner.

## Perímetro

La evidencia queda limitada a teclado, árbol accesible, touch, zoom 200%,
vistas 390/1440, AluxContextChip con datos totalmente ficticios y secuencia
OFF → ON → OFF. El checkout de producto se fija al SHA indicado y el harness
verifica su identidad antes de probar.

Se mantienen datos ficticios, secretos aislados, producción intacta, ausencia
de merge, ausencia de ampliación de I1 y prohibición de iniciar I2. Cualquier
dependencia persistente, dato real o diferencia de producto obliga a detenerse.
