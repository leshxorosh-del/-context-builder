# Context Builder — Backend API

Express + TypeScript API для Конструктора контекста.

## Технологии

- **Express.js** — HTTP фреймворк
- **TypeScript** — статическая типизация
- **PostgreSQL** — реляционная база данных
- **Neo4j** — графовая база данных для контекста
- **Redis** — кэш, сессии, rate limiting
- **Socket.io** — WebSocket real-time
- **OpenAI** — LLM интеграция
- **Jest** — тестирование

## Структура

```
src/
├── config/          # Конфигурация сервисов
│   ├── env.ts       # Переменные окружения
│   ├── logger.ts    # Winston логгер
│   ├── database.ts  # PostgreSQL
│   ├── neo4j.ts     # Neo4j
│   ├── redis.ts     # Redis
│   └── llm.ts       # OpenAI клиент
│
├── models/          # Модели данных
│   ├── User.model.ts
│   ├── Chat.model.ts
│   ├── Message.model.ts
│   ├── SuperChat.model.ts
│   └── Subscription.model.ts
│
├── services/        # Бизнес-логика
│   ├── auth.service.ts
│   ├── chat.service.ts
│   ├── context.service.ts
│   ├── llm.service.ts
│   ├── tariff.service.ts
│   ├── digest.service.ts
│   └── notification.service.ts
│
├── controllers/     # HTTP контроллеры
├── routes/          # Маршруты API
├── middleware/      # Auth, validation, rate limiting
├── websocket/       # Socket.io обработчики
├── cron/            # Планировщик задач
├── utils/           # Утилиты
├── migrations/      # SQL миграции
├── scripts/         # Скрипты (migrate, seed)
└── tests/           # Тесты
```

## API Endpoints

### Аутентификация (`/api/auth`)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/register` | Регистрация пользователя |
| POST | `/login` | Вход в систему |
| POST | `/refresh` | Обновить access token |
| POST | `/logout` | Выход (требует auth) |
| GET | `/me` | Текущий пользователь (требует auth) |

### Чаты (`/api/chats`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Список чатов пользователя |
| POST | `/` | Создать новый чат |
| GET | `/:id` | Получить чат с сообщениями |
| PATCH | `/:id` | Обновить чат (название, позиция) |
| DELETE | `/:id` | Удалить чат (soft delete) |
| POST | `/:id/messages` | Добавить сообщение |
| PATCH | `/:id/messages/:msgId/select` | Переключить выбор сообщения |
| GET | `/:id/selected` | Получить выбранные сообщения |
| POST | `/:id/select-all` | Выбрать все сообщения |
| POST | `/:id/deselect-all` | Снять выбор со всех |

### Супер-чаты (`/api/super-chats`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/project-map` | Карта проекта (узлы + связи) |
| POST | `/` | Создать супер-чат |
| GET | `/:id` | Получить супер-чат с деталями |
| PATCH | `/:id` | Обновить супер-чат |
| DELETE | `/:id` | Удалить супер-чат |
| POST | `/:id/link` | Создать связь с чатом |
| DELETE | `/:id/links/:linkId` | Удалить связь |
| PATCH | `/links/:linkId/messages` | Обновить выбранные сообщения связи |
| POST | `/:id/query` | Отправить запрос с объединённым контекстом |

### Тарифы (`/api/tariffs`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/plans` | Доступные тарифные планы |
| GET | `/status` | Текущий статус подписки |
| POST | `/upgrade` | Обновить тариф |

### Дайджесты (`/api/digests`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/:id/latest` | Последний дайджест супер-чата |
| GET | `/:id/history` | История дайджестов |
| POST | `/:id/send` | Сгенерировать и отправить дайджест |

### Уведомления (`/api/notifications`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/config` | Настройки уведомлений |
| PUT | `/config` | Обновить настройки |
| POST | `/test` | Отправить тестовое уведомление |

## Разработка

```bash
# Установить зависимости
npm install

# Запустить миграции
npm run migrate

# Инициализировать Neo4j
npm run neo4j:init

# Заполнить тестовыми данными
npm run seed

# Запустить в режиме разработки
npm run dev

# Запустить тесты
npm test
npm run test:watch

# Сборка
npm run build
```

## Переменные окружения

См. [../.env.example](../.env.example)

## Миграции

Миграции выполняются автоматически при запуске `npm run migrate`.

Для свежей установки (удаление всех данных):
```bash
npm run migrate:fresh
```
