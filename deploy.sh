#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo 'Usage: ./deploy.sh "Fabric Workspace Name"'
  exit 2
fi
npm test
npm run build
npx rayfin login
npx rayfin up --workspace "$1"
npx rayfin up status
