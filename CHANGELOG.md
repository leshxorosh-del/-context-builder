# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- v0.8.0 — One-Click SaaS: публичный лендинг (`/`), онбординг из трёх шагов после регистрации, лимиты free tier (5 чатов, 1 супер-чат, HTTP 402 при превышении), 7-дневный trial месячного тарифа (`trial_ends_at`, cron сброса), админ-метрики `GET /api/v1/admin/metrics`, страница `/admin`; кнопки Deploy (Vercel/Render) и шаблоны в README.
- v0.7.0 — Agent Trust Protocol (LAMP v0.2): Ed25519 agent keys on cognitive-profile chats (private key returned once; rotate-keys archives public keys); optional signed chat messages + `agent_require_signature`; reputation (`agent_reputation`, trust_score), audit hash-chain log with WebSocket `audit:new-entry` / `agent:trust-score-changed`; APIs `/api/v1/reputation/*`, `/api/v1/audit/*`, `/api/v1/federation/*`, `/api/v1/trust/dashboard`; frontend `/agent-trust`, `/agent-dashboard`; connector stubs in `packages/langchain-connector` and `packages/crewai-connector`.
- v0.6.0 — Agent Cognitive Profiles, Auto-Link Engine UI, Agent Compatibility Panel (preset roles, `set-profile` API, map + panel UX, LAMP checklist and compatibility probe).
- v0.5.0 - Auto-Link Engine: semantic similarity-based chat linking suggestions, agent auto-accept, real-time WebSocket notifications.
- v0.4.0 - AI Agent Magnet: 1:1 OpenAPI validation, agent metrics in health, rate-limit headers, caching, CORS, compatibility endpoint, smoke tests.
- v0.3.0 - AI Agent Ready: OpenAPI spec, AI_AGENT_MANIFEST.md, batch API, example agents, LAMP RFC draft, health endpoint, unified error format.
- Unified repository-level lint/format setup (`.eslintrc.json`, `.prettierrc`, VSCode settings).
- New contributor safety docs and scripts in `security/`:
  - `SECURITY_CHECKLIST.md`
  - `pre-commit-check.sh` / `pre-commit-check.ps1`
  - `SECRETS_ROTATION.md`
- Additional contributor-oriented READMEs for `backend/src`, `frontend/src`, and `docs`.
- New CI workflows:
  - `.github/workflows/lint.yml`
  - `.github/workflows/secret-scan.yml`

### Changed

- Updated `CONTRIBUTING.md` with branch naming, commit conventions, PR checklist, and pre-commit hook setup.
- Updated root `README.md` with contributions badge and clearer secure-contribution links.
- Added extra JSDoc comments in key backend services (`context.service`, `search.service`, `tariff.service`).

## [0.1.0] - 2026-04-30

### Added

- Initial open-source release of Context Builder
- Backend API (auth, chats, super-chats, tariffs, digests, notifications)
- Frontend project map, super-chat UI, and profile/tariff/notification pages
- PostgreSQL + Neo4j + Redis integration
- Dockerized local stack and CI workflows
- Community documents: contributing, code of conduct, security policy
