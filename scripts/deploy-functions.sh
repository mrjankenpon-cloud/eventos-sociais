#!/usr/bin/env bash
# Publica Cloud Functions (reserva PIX ingresso = 10 dias).
# Uso:
#   FIREBASE_TOKEN=... ./scripts/deploy-functions.sh
#   # ou
#   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json ./scripts/deploy-functions.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/functions"
npm ci
npm run build
cd "$ROOT"
if [[ -n "${FIREBASE_TOKEN:-}" ]]; then
  npx --yes firebase-tools@15 deploy --only functions --project eventosociais-c057d --token "$FIREBASE_TOKEN" --non-interactive
elif [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  npx --yes firebase-tools@15 deploy --only functions --project eventosociais-c057d --non-interactive
else
  echo "Defina FIREBASE_TOKEN (firebase login:ci) ou GOOGLE_APPLICATION_CREDENTIALS." >&2
  exit 1
fi
