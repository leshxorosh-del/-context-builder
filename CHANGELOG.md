# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
