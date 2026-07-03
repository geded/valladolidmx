#!/usr/bin/env bash
# Iniciativa 3 · Fase 3.3b — Guard post-eliminación de v2.
#
# Los módulos `eb-studio.functions.ts` y `eb-public.functions.ts` fueron
# eliminados en Fase 3.3b. Este guard evita que reaparezcan importaciones
# o exports de esos símbolos. Cero consumidores permitidos.
# Ver docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md.
set -euo pipefail

PATTERN='experience-builder/(eb-studio|eb-public)(\.functions)?'

# Excluye este script y los documentos históricos del plan (menciones OK).
matches=$(rg -n --no-heading \
  -g '!scripts/assert-no-v2-imports.sh' \
  -g '!docs/**' \
  "$PATTERN" src/ scripts/ 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "❌ Fase 3.3b violation — reapareció código v2 (eb-studio / eb-public):"
  echo "$matches"
  echo
  echo "v2 fue eliminado. Usa page_compositions (v1)."
  exit 1
fi

echo "✅ Fase 3.3b OK — cero rastros de v2 en el código."
