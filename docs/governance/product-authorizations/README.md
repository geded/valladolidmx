# Product Change Authorizations

Esta carpeta contiene permisos ejecutables para cambios sensibles de producto. Un manifiesto no sustituye al Blueprint: lo acota a archivos y operaciones concretas.

Reglas:

1. Sólo `Approved` autoriza un cambio nuevo.
2. La autorización sólo es válida en la rama exacta declarada.
3. Cada permiso usa una ruta de archivo exacta; globs y directorios están prohibidos.
4. `modify`, `create`, `delete` y `rename` son permisos diferentes.
5. `rename` declara `path` (origen) y `to` (destino).
6. Toda autorización referencia un Blueprint admitido como `Approved` en 06 y conserva evidencia Founder literal.
7. Si cambia el alcance, se detiene la implementación y se obtiene aprobación antes de editar el manifiesto.

Ejemplo mínimo:

```json
{
  "$schema": "../../../scripts/governance/schemas/product-authorization.schema.json",
  "id": "PCA-2026-001",
  "title": "Ajuste visual aprobado",
  "status": "Approved",
  "branch": "visual/approved-adjustment",
  "blueprint": "docs/blueprint/18.04-OMXDS-VISUAL-SURFACES-PRD-SUITE-v1.0.md",
  "founder_authority": "Founder Decision YYYY-MM-DD · alcance literal aprobado.",
  "permissions": [
    { "operation": "modify", "path": "src/components/cards/ExampleCard.tsx" }
  ],
  "public_routes": [],
  "required_feature_flags": [],
  "required_tests": ["bun run typecheck"]
}
```
