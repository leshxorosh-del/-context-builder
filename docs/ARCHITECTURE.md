# Context Builder Architecture

## Overview

Context Builder is a monorepo with two applications:

- `frontend/` — React + Vite UI
- `backend/` — Express + TypeScript API

Core storage and runtime dependencies:

- PostgreSQL for relational entities (users, chats, messages, subscriptions)
- Neo4j for graph relationships between chats and super-chats
- Redis for cache, token/session support, and rate-limit helpers

## High-Level Components

1. **Frontend (React)**
   - Project map (graph view)
   - Chat/super-chat interaction flows
   - Profile, tariff, and notification settings

2. **Backend (Express)**
   - Authentication and authorization
   - Chat/message CRUD and selection flow
   - Context aggregation for super-chat queries
   - Digest generation and outbound notifications
   - WebSocket gateway for real-time updates

3. **Data Layer**
   - PostgreSQL models and migrations (`backend/src/migrations`)
   - Neo4j graph service for relationship topology
   - Redis service for transient/security-critical state

4. **Ops Layer**
   - Docker Compose for local orchestration
   - GitHub Actions for lint/typecheck/tests

## Request Flow (Typical)

1. User action in frontend triggers REST request.
2. Backend validates payload and auth context.
3. Business service loads structured data from PostgreSQL.
4. Relationship graph is read/updated in Neo4j where needed.
5. Redis is used for cache/rate-limit/session checks.
6. Response returns to frontend; optional real-time event via WebSocket.

## Security Boundaries

- JWT-based auth middleware guards protected routes.
- Validation middleware enforces shape/limits on incoming inputs.
- Rate limiting and security headers are applied at app middleware level.
- Sensitive configuration is supplied via environment variables.

## Repository Layout

```text
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── websocket/
│   │   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
├── docker-compose.yml
└── docs/ARCHITECTURE.md
```
