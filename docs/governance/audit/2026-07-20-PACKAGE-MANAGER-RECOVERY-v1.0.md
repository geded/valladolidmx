# Recuperación del gestor de paquetes y lockfile

**Estado:** Executed

**Versión:** 1.0

**Fecha:** 2026-07-20

## 1. Problema detectado

El repositorio mantenía simultáneamente `bun.lock` y `package-lock.json`, pero solo el primero evolucionaba junto con `package.json` durante el trabajo de Lovable. El lockfile de npm quedó desincronizado, por lo que `npm ci` no podía instalar el proyecto.

Además, 851 resoluciones de `bun.lock` apuntaban a dos cachés regionales de Lovable. Fuera de ese entorno algunos tarballs producían errores de integridad aunque las versiones y hashes coincidían con los paquetes publicados en npm.

## 2. Evidencia histórica

- El template inicial de 2025 incluía `bun.lock`, `bunfig.toml` y `package.json`; no incluía `package-lock.json`.
- Los cambios funcionales recientes actualizaban `package.json` y `bun.lock` juntos.
- `package-lock.json` apareció posteriormente y dejó de actualizarse con las dependencias nuevas.
- La configuración de seguridad `minimumReleaseAge` ya estaba declarada en `bunfig.toml`.

## 3. Decisión ejecutada

- Bun queda declarado como gestor único mediante `"packageManager": "bun@1.3.14"`.
- `bun.lock` queda como único lockfile canónico.
- `package-lock.json` se retira por ser obsoleto y contradictorio.
- La fijación de `entities@4.5.0` pasa de `pnpm.overrides` a `overrides`, formato soportado por Bun.
- Las URLs de los tarballs se normalizan a `https://registry.npmjs.org/` sin cambiar nombres, versiones ni integridades.
- Se añade el script `typecheck` para hacer explícita la validación TypeScript.
- `src/routeTree.gen.ts` se actualiza con la salida generada por el build reproducible de TanStack Start.

## 4. Comandos canónicos

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Toda modificación de dependencias debe actualizar `package.json` y `bun.lock` en el mismo commit. No se debe volver a generar un lockfile de npm, pnpm o Yarn.

## 5. Validación

- Instalación limpia con `bun install --frozen-lockfile`: correcta, 919 paquetes instalados.
- Validación de lockfile en modo frozen y lockfile-only: correcta.
- TypeScript con `tsc --noEmit`: correcto.
- Suite Bun: 143 pruebas aprobadas, 0 fallidas.
- Build de producción Vite/Nitro/PWA: correcto.
- Segunda generación del lockfile en modo frozen: sin cambios de resolución.

## 6. Deuda no incluida

- `bun run lint` reporta 15,696 problemas heredados, principalmente formato Prettier. Su corrección masiva requiere una fase separada para no mezclar cambios funcionales y mecánicos.
- El build emite avisos de APIs de TanStack Start deprecadas y un patrón PWA sin coincidencias. No bloquean la compilación, pero deben incorporarse al backlog técnico.
