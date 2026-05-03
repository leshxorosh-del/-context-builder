<div align="center">
  <img src="frontend/public/favicon.svg" alt="Context Builder Logo" width="80" height="80">
  
  # Context Builder
  
  **Visual knowledge graph for LLMs — unite context across multiple chats**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/leshxorosh-del/-context-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/leshxorosh-del/-context-builder/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 🎯 The Problem

When working with AI assistants, your knowledge gets **fragmented across dozens of separate chats**. Each conversation exists in isolation — the AI doesn't remember what you discussed yesterday, in another chat, or in a different context.  
**Код читаемый, стиль автоматизирован, секреты под защитой.**

**Context Builder** solves this by letting you:

- Visualize all your chats as a **project map** (graph)
- **Connect related chats** into "Super Chats" with unified context
- **Selectively include specific messages** (not entire chats) to save tokens
- Get **daily AI-generated digests** summarizing changes across your projects

<div align="center">
  <img src="docs/images/project-map-preview.png" alt="Project Map Preview" width="700">
  <p><em>Visual project map with chats, super-chats, and context links</em></p>
</div>

> **Note:** If you don't have screenshots yet, run the app locally and capture the main screens. Place them in `docs/images/`.

---

## ✨ Features

### 🗺️ Visual Project Map

- **Drag-and-drop graph editor** powered by React Flow
- Chat nodes (blue) and Super-Chat nodes (purple)
- Visual context links showing message selection status

### 🔗 Smart Context Merging

- Connect multiple chats to a single Super-Chat
- **Selective message inclusion** — check only the messages you need
- Token counter shows estimated context size

### 💬 Super-Chat Conversations

- Query your AI with **combined knowledge** from all linked chats
- See which sources were used for each response
- Full conversation history within the Super-Chat
- **Voice input** (Web Speech API, Russian) in the super-chat composer

### 🔎 Semantic Search

- **Ctrl/Cmd+K** (or header search): find chats by meaning, not only keywords (pgvector + OpenAI embeddings)
- Modes: **hybrid** (messages + chat summaries), **messages**, **chats**
- Open a hit on the map with highlighted messages, or **link the chat to a super-chat** from the result card
- Full-page results: `/search?q=…`

### 📊 Daily Digests & Notifications

- **LLM-generated summaries** of activity across your projects
- Push to Telegram, Email, or Slack
- Configurable schedule and triggers

### 💳 Flexible Pricing Model (Self-Hosted)

- **Free**: 3 queries/day
- **Monthly**: 50 initial + 2/day (accumulates up to 100)
- **Yearly**: Unlimited

---

## 🛠️ Tech Stack

| Layer         | Technologies                                                              |
| ------------- | ------------------------------------------------------------------------- |
| **Frontend**  | React 18, TypeScript, Vite, Tailwind CSS, React Flow, Zustand             |
| **Backend**   | Node.js, Express, TypeScript, Socket.io                                   |
| **Databases** | PostgreSQL + **pgvector** (semantic search), Neo4j (graph), Redis (cache) |
| **AI**        | OpenAI API (GPT-4 Turbo)                                                  |
| **DevOps**    | Docker, Docker Compose, GitHub Actions                                    |

---

## 🚀 Быстрый старт (Локально)

### Требования

- [Docker](https://www.docker.com/get-started) (с Docker Compose)
- [Node.js](https://nodejs.org/) 20+ (опционально, для разработки без Docker)
- Ключ [OpenAI API](https://platform.openai.com/account/api-keys) (для LLM/семантического поиска)

### 1. Клонирование и настройка

```bash
git clone https://github.com/leshxorosh-del/-context-builder.git
cd -- -context-builder
```

### 2. Настройка переменных окружения

```bash
chmod +x setup-env.sh && ./setup-env.sh   # Linux/macOS
# или
.\setup-env.ps1                           # Windows (PowerShell)
```

После этого отредактируйте `backend/.env`, обязательно вставив свой `OPENAI_API_KEY`.

> ⚠️ **Никогда не коммитьте файл `.env` в репозиторий!** Он добавлен в `.gitignore`. Используйте `.env.example` как шаблон.

### 3. Запуск одной командой

```bash
./start.sh
```

Если файл не исполняемый:

```bash
chmod +x ./start.sh
./start.sh
```

Windows PowerShell:

```powershell
.\start.ps1
```

Скрипт автоматически:

- проверяет Docker + Compose;
- создаёт `.env` из шаблона (если нет);
- запускает `docker-compose up -d --build`;
- ждёт готовность сервисов и показывает ссылки.

### 4. Открыть в браузере

- Frontend: `http://localhost:5173` (или порт из `FRONTEND_PORT` в `.env`)
- Backend API: `http://localhost:3001`
- Neo4j Browser: `http://localhost:7474` (логин `neo4j`, пароль из `NEO4J_PASSWORD`)

### 5. Остановка

```bash
docker-compose down
```

Данные сохраняются в Docker volumes, поэтому при следующем `docker-compose up -d` база останется.

### Примечание о первом запуске

- Миграции PostgreSQL запускаются автоматически в `backend` контейнере при старте.
- Инициализация индексов/constraints Neo4j тоже запускается автоматически (идемпотентно).
- Если что-то не применилось:

```bash
docker-compose exec backend npm run migrate:prod
docker-compose exec backend npm run neo4j:init
```

### Частые проблемы

- Если занят порт `5173`: измените `FRONTEND_PORT` в `.env` (например, `FRONTEND_PORT=5180`) и перезапустите compose.
- Если semantic search недоступен: проверьте `OPENAI_API_KEY` и `OPENAI_EMBEDDING_MODEL`.
- Если был старый volume Postgres без pgvector: выполните `docker-compose down -v` и поднимите проект заново.

## 🧪 Разработка (без Docker для backend/frontend)

```bash
# 1) Поднять только базы
docker-compose up -d postgres neo4j redis

# 2) Установить зависимости монорепо
npm install

# 3) Применить SQL миграции и инициализировать Neo4j
npm run migrate --workspace=backend
npm run neo4j:init --workspace=backend

# 4) Запустить backend и frontend в dev-режиме (в разных терминалах)
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

Тесты:

```bash
npm test
```

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  React + Vite + Tailwind + React Flow                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Project Map │ │ Super-Chat  │ │  Settings   │              │
│  │   (Graph)   │ │   (Chat)    │ │  (Tariffs)  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API + WebSocket
┌────────────────────────────┴────────────────────────────────────┐
│                         BACKEND                                 │
│  Express + TypeScript + Socket.io                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │  Chats   │ │ Context  │ │ Tariffs  │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└───────┬──────────────┬──────────────┬───────────────────────────┘
        │              │              │
   ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
   │PostgreSQL│    │  Neo4j  │    │  Redis  │
   │(Relational)│  │ (Graph) │    │ (Cache) │
   └──────────┘    └─────────┘    └─────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📖 API Reference

Full API documentation is available in [backend/README.md](backend/README.md).

**Key endpoints:**

| Endpoint                          | Description               |
| --------------------------------- | ------------------------- |
| `POST /api/auth/register`         | Create account            |
| `GET /api/chats`                  | List user's chats         |
| `POST /api/super-chats`           | Create a Super-Chat       |
| `POST /api/super-chats/:id/link`  | Link a chat to Super-Chat |
| `POST /api/super-chats/:id/query` | Query with merged context |
| `GET /api/project-map`            | Get visual graph data     |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
Security-first checklist for PRs: [security/SECURITY_CHECKLIST.md](security/SECURITY_CHECKLIST.md)

### Quick Contribution Guide

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** and write tests
4. **Run checks**: `npm run lint && npm test`
5. **Commit**: `git commit -m "feat: add amazing feature"`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Reporting Issues

- 🐛 **Bugs**: [Open an issue](https://github.com/leshxorosh-del/-context-builder/issues/new?template=bug_report.md)
- 💡 **Features**: [Request a feature](https://github.com/leshxorosh-del/-context-builder/issues/new?template=feature_request.md)
- 🔒 **Security**: See [SECURITY.md](SECURITY.md)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev/) — beautiful graph visualization
- [OpenAI](https://openai.com/) — powerful language models
- [Tailwind CSS](https://tailwindcss.com/) — utility-first styling
- [Neo4j](https://neo4j.com/) — graph database for context relationships

---

## 🌍 README Language

This README is in English for the global open-source community.  
For a short Russian version, see [README.ru.md](README.ru.md).

---

## 📬 Contact

- **Email**: `leshxorosh@gmail.com`
- **Telegram**: [@leshxorosh](https://t.me/leshxorosh)
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas

---

## 🔒 Security

- Security policy and responsible disclosure process: [SECURITY.md](SECURITY.md)
- Automated security checks in CI: `.github/workflows/security.yml`
- Dependency update automation: `.github/dependabot.yml`

---

<div align="center">
  <sub>Built with ❤️ for the AI community</sub>
</div>
