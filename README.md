<div align="center">
  <img src="frontend/public/favicon.svg" alt="Context Builder Logo" width="80" height="80">
  
  # Context Builder
  
  **Visual knowledge graph for LLMs — unite context across multiple chats**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![CI](https://github.com/leshxorosh-del/-context-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/leshxorosh-del/-context-builder/actions/workflows/ci.yml)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)

  [Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 🎯 The Problem

When working with AI assistants, your knowledge gets **fragmented across dozens of separate chats**. Each conversation exists in isolation — the AI doesn't remember what you discussed yesterday, in another chat, or in a different context.

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

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Flow, Zustand |
| **Backend** | Node.js, Express, TypeScript, Socket.io |
| **Databases** | PostgreSQL (relational), Neo4j (graph), Redis (cache) |
| **AI** | OpenAI API (GPT-4 Turbo) |
| **DevOps** | Docker, Docker Compose, GitHub Actions |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ 
- **Docker** & Docker Compose
- **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/leshxorosh-del/-context-builder.git
cd context-builder

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

**Access the app:**
- Frontend: http://localhost:5173
- API: http://localhost:3001
- Neo4j Browser: http://localhost:7474

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start databases only
docker-compose up -d postgres neo4j redis

# Run database migrations
npm run migrate --workspace=backend

# Initialize Neo4j schema
npm run neo4j:init --workspace=backend

# Start development servers (in separate terminals)
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

### First Steps

1. Open http://localhost:5173
2. Register a new account
3. Create your first chat
4. Create a Super-Chat and link your chats to it
5. Start querying with unified context!

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

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `GET /api/chats` | List user's chats |
| `POST /api/super-chats` | Create a Super-Chat |
| `POST /api/super-chats/:id/link` | Link a chat to Super-Chat |
| `POST /api/super-chats/:id/query` | Query with merged context |
| `GET /api/project-map` | Get visual graph data |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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
