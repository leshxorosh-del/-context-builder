#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if ! has_cmd docker; then
  echo "❌ Docker не найден. Установите Docker Desktop: https://www.docker.com/get-started"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif has_cmd docker-compose; then
  COMPOSE_CMD=(docker-compose)
else
  echo "❌ Docker Compose не найден. Установите Docker Desktop с Compose."
  exit 1
fi

HTTP_CHECKER=""
if has_cmd curl; then
  HTTP_CHECKER="curl"
elif has_cmd wget; then
  HTTP_CHECKER="wget"
else
  echo "⚠️  Ни curl, ни wget не найдены. Пропускаю HTTP-проверки готовности."
fi

if [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo "⚠️  Создан .env из .env.example"
  echo "   Перед прод-использованием добавьте OPENAI_API_KEY в .env"
fi

echo "🚀 Запускаю сервисы..."
"${COMPOSE_CMD[@]}" up -d --build

wait_http() {
  local name="$1"
  local url="$2"
  local retries="${3:-60}"
  local delay="${4:-5}"

  if [ -z "$HTTP_CHECKER" ]; then
    return 0
  fi

  echo "⏳ Ожидание ${name} (${url})..."
  for i in $(seq 1 "$retries"); do
    if [ "$HTTP_CHECKER" = "curl" ] && curl -fsS "$url" >/dev/null 2>&1; then
      echo "✅ ${name} готов"
      return 0
    fi
    if [ "$HTTP_CHECKER" = "wget" ] && wget -q --spider "$url" >/dev/null 2>&1; then
      echo "✅ ${name} готов"
      return 0
    fi
    sleep "$delay"
  done

  echo "❌ ${name} не поднялся вовремя"
  return 1
}

wait_http "Backend" "http://localhost:3001/health" 72 5 || true
wait_http "Frontend" "http://localhost:${FRONTEND_PORT:-5173}/health" 72 5 || true
wait_http "Neo4j Browser" "http://localhost:7474" 72 5 || true

echo ""
echo "🎉 Context Builder локально запущен"
echo "   Frontend:      http://localhost:${FRONTEND_PORT:-5173}"
echo "   Backend API:   http://localhost:3001"
echo "   Neo4j Browser: http://localhost:7474"
echo ""
echo "Если backend не healthy, выполните миграции вручную:"
echo "   ${COMPOSE_CMD[*]} exec backend npm run migrate:prod"
echo "и (опционально) инициализацию Neo4j:"
echo "   ${COMPOSE_CMD[*]} exec backend npm run neo4j:init"
