# Contributing to Context Builder

Спасибо за вклад в Context Builder.

## 1) Ветки и naming

- Для новых фич: `feature/<short-name>`
- Для исправлений: `fix/<short-name>`
- Для документации: `docs/<short-name>`

Примеры:

- `feature/search-shortcuts`
- `fix/jwt-refresh-guard`
- `docs/security-checklist`

## 2) Коммиты (Conventional Commits)

Используйте формат:

```text
<type>: <short description>
```

Поддерживаемые типы:

- `feat:`
- `fix:`
- `docs:`
- `chore:`
- `refactor:`
- `test:`

## 3) Локальная подготовка

```bash
git clone https://github.com/leshxorosh-del/-context-builder.git
cd -- -context-builder
chmod +x setup-env.sh && ./setup-env.sh
npm install
```

## 4) Обязательные проверки перед PR

В корне проекта:

```bash
npm run lint
npm run build
npm test
npm run test:contract --workspace=backend
```

Дополнительно проверьте:

- backend:
  - `npm run lint --workspace=backend`
  - `npm run build --workspace=backend`
  - `npm run test:contract --workspace=backend` (против запущенного API, `API_TEST_URL` в `backend/.env.test`)
- frontend:
  - `npm run lint --workspace=frontend`
  - `npm run build --workspace=frontend`

Если добавили новый функционал — добавьте/обновите тесты.

## 5) Security правила

- Никогда не коммитьте `.env`.
- Новые env-переменные обязательно добавляйте в `.env.example`.
- Перед PR пройдите чеклист: `security/SECURITY_CHECKLIST.md`.

## 6) Настройка pre-commit хука

Linux/macOS:

```bash
cp security/pre-commit-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Windows PowerShell:

```powershell
Copy-Item security/pre-commit-check.ps1 .git/hooks/pre-commit.ps1
```

## 7) Что должно быть в описании PR

- Что сделано.
- Зачем сделано.
- Как тестировалось.
- Скриншоты (если менялся UI).
- Ссылка на issue (если есть).

## 8) Полезные документы

- Security guide: `docs/SECURITY_GUIDE.md`
- Security checklist: `security/SECURITY_CHECKLIST.md`
- Incident runbook: `security/SECRETS_ROTATION.md`

## 9) For AI Agents Contributing

AI agents are welcome to contribute using the same PR process as human contributors.

- follow branch and commit naming rules;
- run lint/build/tests before opening PR;
- include concise rationale and validation notes in PR description;
- do not commit secrets or private credentials.
