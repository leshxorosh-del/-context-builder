# Context Builder — Frontend

React + Vite + Tailwind приложение для Конструктора контекста.

## Технологии

- **React 18** — UI библиотека
- **Vite** — сборщик
- **TypeScript** — статическая типизация
- **Tailwind CSS** — стилизация
- **React Flow** — визуальный граф
- **Zustand** — state management
- **React Query** — серверное состояние
- **Socket.io Client** — WebSocket

## Структура

```
src/
├── components/         # UI компоненты
│   ├── Layout/        # Layouts (Main, Auth)
│   ├── Auth/          # Аутентификация
│   ├── Map/           # Карта проекта
│   │   ├── ChatNode.tsx
│   │   ├── SuperChatNode.tsx
│   │   ├── ContextEdge.tsx
│   │   └── CreateSuperChatModal.tsx
│   ├── Context/       # Контекст и выбор
│   │   └── ChatDetailPanel.tsx
│   └── common/        # Общие компоненты
│       ├── Button.tsx
│       ├── Input.tsx
│       └── LoadingScreen.tsx
│
├── pages/             # Страницы приложения
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ProjectMapPage.tsx
│   ├── SuperChatPage.tsx
│   ├── ProfilePage.tsx
│   ├── TariffsPage.tsx
│   └── NotificationSettingsPage.tsx
│
├── store/             # Zustand сторы
│   ├── authStore.ts   # Аутентификация
│   ├── mapStore.ts    # Карта проекта
│   ├── contextStore.ts # Супер-чат
│   └── tariffStore.ts  # Тарифы
│
├── services/          # API и сервисы
│   ├── api.ts         # Axios клиент
│   └── socket.ts      # Socket.io клиент
│
├── styles/
│   └── globals.css    # Глобальные стили
│
├── App.tsx            # Роутинг
└── main.tsx           # Точка входа
```

## Компоненты карты

### ChatNode
Узел обычного чата. Отображает название, количество сообщений и выбранных.

### SuperChatNode
Узел супер-чата (фиолетовый). Показывает количество источников. Двойной клик открывает чат.

### ContextEdge
Связь между узлами. Показывает количество выбранных сообщений. Анимация при наличии выбора.

## Сторы

### authStore
- `user` — текущий пользователь
- `isAuthenticated` — статус авторизации
- `login()`, `register()`, `logout()` — действия

### mapStore
- `nodes` — узлы графа (чаты, супер-чаты)
- `edges` — связи между узлами
- `loadMap()` — загрузить карту проекта
- `addChatNode()`, `addSuperChatNode()` — создание узлов
- `onConnect()` — создание связи

### contextStore
- `superChat` — текущий супер-чат
- `messages` — история сообщений
- `sendQuery()` — отправить запрос с контекстом

### tariffStore
- `status` — текущий тариф и квота
- `plans` — доступные планы
- `upgradePlan()` — обновить тариф

## Разработка

```bash
# Установить зависимости
npm install

# Запустить dev сервер
npm run dev

# Сборка
npm run build

# Предпросмотр сборки
npm run preview

# Линтер
npm run lint
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VITE_API_URL` | URL API сервера |
| `VITE_WS_URL` | URL WebSocket сервера |

## Цветовая схема

- **Primary (Indigo)** — основной цвет интерфейса
- **Accent (Violet)** — супер-чаты и акценты
- **Blue** — обычные чаты
- **Success (Green)** — выбранные элементы, успех
- **Warning (Amber)** — предупреждения
- **Error (Red)** — ошибки
