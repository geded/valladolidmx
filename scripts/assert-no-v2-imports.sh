#!/usr/bin/env bash
# Iniciativa 3 · Fase 3.3a.1 — Guard estricto de v2.
#
# Falla si algún archivo del repo importa `eb-studio.functions` o
# `eb-public.functions` fuera de esos propios módulos. v2 está congelado.
# La whitelist temporal de 3.3a (rutas /l/$slug y /preview/$token) fue
# retirada en 3.3a.1 tras reescribir /l/$slug sobre v1 y jubilar
# /preview/$token. Cero consumidores permitidos.
# Ver docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md.
set -euo pipefail

PATTERN='experience-builder/(eb-studio|eb-public)(\.functions)?'

# Excluye los propios módulos v2, este script y los documentos del plan.
matches=$(rg -n --no-heading \
  -g '!src/lib/experience-builder/eb-studio.functions.ts' \
  -g '!src/lib/experience-builder/eb-public.functions.ts' \
  -g '!scripts/assert-no-v2-imports.sh' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-RESOLUCION-RUTAS-V2.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md' \
  "$PATTERN" src/ scripts/ 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "❌ Fase 3.3a.1 violation — consumidores de v2 detectados:"
  echo "$matches"
  echo
  echo "v2 (eb-studio / eb-public) está congelado. Usa page_compositions (v1)."
  exit 1
fi

echo "✅ Fase 3.3a.1 OK — cero consumidores de v2 fuera de sus módulos."
