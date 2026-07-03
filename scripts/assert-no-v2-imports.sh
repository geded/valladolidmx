#!/usr/bin/env bash
# Iniciativa 3 · Fase 3.3a — Soft freeze de v2 (page_compositions).
#
# Falla si algún archivo del repo importa `eb-studio.functions` o
# `eb-public.functions` fuera de esos propios módulos. v2 está congelado.
# Ver docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md.
set -euo pipefail

PATTERN='experience-builder/(eb-studio|eb-public)(\.functions)?'

# Whitelist congelado (Fase 3.3a): call-sites que YA existían antes del freeze.
# Se retiran en Fase 3.3b junto con el borrado del código v2. Prohibido añadir
# nuevos archivos a esta lista sin autorización explícita del Founder.
#
#   src/routes/l.$slug.tsx           — ebResolvePublicPage + applyVariantOverrides
#   src/routes/preview.$token.tsx    — ebResolvePreview
#
# Excluye además los propios módulos v2, este script y los documentos del plan.
matches=$(rg -n --no-heading \
  -g '!src/lib/experience-builder/eb-studio.functions.ts' \
  -g '!src/lib/experience-builder/eb-public.functions.ts' \
  -g '!src/routes/l.$slug.tsx' \
  -g '!src/routes/preview.$token.tsx' \
  -g '!scripts/assert-no-v2-imports.sh' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md' \
  -g '!docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md' \
  "$PATTERN" src/ scripts/ 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "❌ Fase 3.3a violation — nuevos consumidores de v2 detectados:"
  echo "$matches"
  echo
  echo "v2 (eb-studio / eb-public) está congelado. Usa page_compositions (v1)."
  exit 1
fi

echo "✅ Fase 3.3a OK — cero consumidores de v2 fuera de sus módulos."
