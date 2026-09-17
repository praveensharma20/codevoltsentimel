# SecureReview AI

SecureReview AI is a production-ready blueprint for an intelligent and secure code review platform. It combines a React dashboard with a FastAPI backend that accepts source uploads or GitHub repository URLs, runs Semgrep and Bandit, normalizes findings, and presents actionable vulnerability reports with filtering and export.

## Capabilities

- JWT-based authentication with password hashing and a mandatory non-default signing secret.
- Secure archive upload with size, extension, path traversal, and zip-bomb protections.
- GitHub repository ingestion via allow-listed `https://github.com/<owner>/<repo>` URLs.
- Static analysis orchestration for Semgrep and Bandit with timeout controls.
- Detection categories for SQL injection, XSS, hardcoded credentials, insecure patterns, and logic-risk rules.
- Finding normalization with file path, line number, severity, explanation, and fix recommendation.
- Interactive React dashboard with severity/category/search filters and JSON/CSV export.
- Scalable architecture boundaries for API, scanning workers, storage, and UI.

## Architecture

```text
frontend/ React + Vite + TypeScript
backend/  FastAPI application
  app/api/        HTTP routes for auth, scans, reports
  app/core/       configuration and security helpers
  app/models/     Pydantic schemas
  app/services/   upload, GitHub, scanner, report services
```

The default implementation runs scans synchronously for local development. In production, move `ScanService.run_scan` behind a worker queue such as Celery, RQ, Dramatiq, or Arq, persist scan state in Postgres, store uploads in object storage, and isolate scanners in locked-down containers.

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
uvicorn app.main:app --reload
```

Optional scanner CLIs:

```bash
pip install semgrep bandit
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API overview

- `POST /api/auth/register` creates a user.
- `POST /api/auth/login` returns a bearer token.
- `POST /api/scans/upload` uploads `.zip`, `.tar`, `.tar.gz`, or `.tgz` source code.
- `POST /api/scans/github` scans a GitHub repository URL.
- `GET /api/scans/{scan_id}` retrieves normalized findings.
- `GET /api/reports/{scan_id}?format=json|csv` exports a report.

## Security notes

- Never execute submitted code; scanners are invoked with read-only inputs and explicit timeouts.
- Run scan jobs in ephemeral containers without secrets, metadata-service access, or write access outside a scratch directory.
- Validate and cap archive contents before extraction.
- Prefer tuned Semgrep rulesets and confidence scoring to reduce false positives.
- Set a strong, private `JWT_SECRET` before startup; the backend fails fast if it is missing or left as the placeholder.
- Require GitHub App installation tokens in production rather than user-submitted personal access tokens.
