# Context Builder — Быстрый локальный запуск

**Context Builder** — open-source визуальный конструктор контекста для LLM: объединяет данные из нескольких чатов, показывает связи на карте и позволяет задавать вопросы к общему контексту.

## 🚀 Быстрый старт (10 минут)

### Требования

- [Docker](https://www.docker.com/get-started) с Docker Compose
- [Node.js](https://nodejs.org/) 20+ (опционально, для запуска без Docker)
- [OpenAI API Key](https://platform.openai.com/account/api-keys) для LLM/семантического поиска

### 1) Клонирование и `.env`

```bash
git clone https://github.com/leshxorosh-del/-context-builder.git
cd -- -context-builder
```

### 2) Настройка переменных окружения

```bash
chmod +x setup-env.sh && ./setup-env.sh   # Linux/macOS
# или
.\setup-env.ps1                           # Windows (PowerShell)
```

После этого откройте `backend/.env` и укажите минимум:

```env
OPENAI_API_KEY=sk-...
```

> ⚠️ **Никогда не коммитьте файл `.env` в репозиторий!** Используйте `.env.example` как шаблон.

### 3) Запуск одной командой

Linux/macOS:

```bash
chmod +x ./start.sh
./start.sh
```

Windows (PowerShell):

```powershell
.\start.ps1
```

Скрипты автоматически:
- проверяют Docker и Compose;
- создают `.env` из шаблона, если файла нет;
- выполняют `docker-compose up -d --build`;
- ждут готовности сервисов и выводят ссылки.

### 4) Открыть в браузере

- Frontend: `http://localhost:5173` (или порт `FRONTEND_PORT` из `.env`)
- Backend API: `http://localhost:3001`
- Neo4j Browser: `http://localhost:7474` (логин `neo4j`, пароль из `NEO4J_PASSWORD`)

### 5) Остановка

```bash
docker-compose down
```

Данные PostgreSQL/Neo4j/Redis сохраняются в Docker volumes.

## Важно про первый запуск

- SQL-миграции PostgreSQL запускаются автоматически при старте backend-контейнера.
- Инициализация индексов/constraints в Neo4j также выполняется автоматически (идемпотентно).
- Если нужно вручную:

```bash
docker-compose exec backend npm run migrate:prod
docker-compose exec backend npm run neo4j:init
```

## Частые проблемы

- Порт `5173` занят: смените `FRONTEND_PORT` в `.env` (например, `5180`) и перезапустите.
- Semantic search не работает: проверьте `OPENAI_API_KEY` и `OPENAI_EMBEDDING_MODEL`.
- После смены образа Postgres на pgvector не стартует БД: `docker-compose down -v`, затем `docker-compose up -d`.

## Режим разработки (без Docker для app)

```bash
# 1) Поднять только базы
docker-compose up -d postgres neo4j redis

# 2) Установить зависимости
npm install

# 3) Подготовить БД
npm run migrate --workspace=backend
npm run neo4j:init --workspace=backend

# 4) Запустить backend/frontend в dev (в отдельных терминалах)
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

Тесты:

```bash
npm test
```

---

Подробная англоязычная документация: [README.md](README.md)
