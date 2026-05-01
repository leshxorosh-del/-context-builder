#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"
  if [ ! -f "$target_file" ]; then
    cp "$source_file" "$target_file"
    echo "✅ Created: $target_file"
  else
    echo "ℹ️  Exists: $target_file"
  fi
}

# Keep root .env for docker-compose convenience.
# Корневой .env нужен для удобного docker-compose запуска.
copy_if_missing ".env.example" ".env"
copy_if_missing "backend/.env.example" "backend/.env"
copy_if_missing "frontend/.env.example" "frontend/.env"

chmod +x "./setup-env.sh" 2>/dev/null || true
chmod +x "./start.sh" 2>/dev/null || true

echo ""
echo "⚠️  Файлы .env созданы из шаблонов. ОБЯЗАТЕЛЬНО отредактируйте backend/.env, добавив свои реальные ключи (OPENAI_API_KEY, JWT_SECRET)."
echo "⚠️  .env files were generated from templates. You MUST edit backend/.env and add real keys (OPENAI_API_KEY, JWT_SECRET)."
