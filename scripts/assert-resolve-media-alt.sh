#!/usr/bin/env bash
# H3·A3.b · Guard: ningún componente público puede leer `alt_text`
# directamente. Toda resolución debe ir por `resolveMediaAlt()`.
#
# Uso: bash scripts/assert-resolve-media-alt.sh
set -euo pipefail

# Whitelist: pipeline oficial (server/CMS interno).
ALLOW_PATTERN='src/(lib/(cms|media|catalog|experience-builder|portal)/|components/cms/|routes/_authenticated/cms/|integrations/supabase/types\.ts)'

MATCHES=$(rg -n "\\balt_text\\b" src \
  --glob '!src/lib/**' \
  --glob '!src/components/cms/**' \
  --glob '!src/routes/_authenticated/cms/**' \
  --glob '!src/integrations/supabase/**' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "❌ H3·A3.b guard: acceso directo a alt_text en superficie pública."
  echo "   Toda lectura debe pasar por resolveMediaAlt()."
  echo "$MATCHES"
  exit 1
fi

echo "✅ H3·A3.b guard OK — sin lecturas directas de alt_text en superficie pública."