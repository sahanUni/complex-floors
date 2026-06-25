---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Dual .env Config: Separate Environment Files for Backend and Frontend

## Context and Problem Statement

The application has two separate processes (FastAPI backend, Next.js frontend) each with their own configuration needs: ports, paths, API URLs, and future secrets like `OPENAI_API_KEY`. We need a configuration pattern that is secure, portable, and sets a clear convention for adding future config without hardcoding.

## Decision Drivers

- Secrets (API keys) must not be hardcoded in source files
- Each process must own its own configuration — no shared config file
- Config must be overridable per environment (dev, future staging/prod)
- Frontend must not have access to backend secrets
- Pattern must work with both FastAPI (`python-dotenv`) and Next.js (native `.env.local` support)

## Considered Options

- Separate `.env` files per process: `backend/.env` and `frontend/.env.local`
- Single root-level `.env` shared by both processes
- Hardcoded defaults with environment variable overrides (no `.env` files)

## Decision Outcome

Chosen option: "Separate `.env` files per process", because each process has distinct secrets and config, Next.js natively loads `frontend/.env.local`, and keeping them separate prevents backend secrets (e.g. `OPENAI_API_KEY`) from ever being accessible to the frontend process.

**`backend/.env` variables:**
- `PORT` — backend listen port (default: 8010)
- `DB_PATH` — SQLite file path (default: `./db.sqlite`)
- `UPLOAD_ROOT` — file server root (default: `./uploads`)
- `OPENAI_API_KEY` — populated when vision change lands

**`frontend/.env.local` variables:**
- `NEXT_PUBLIC_API_URL` — backend base URL (default: `http://localhost:8010`)
- `PORT` — frontend listen port (default: 3010)

Both files are gitignored. Example files (`backend/.env.example`, `frontend/.env.local.example`) are committed.

### Consequences

- Good, because backend secrets are never accessible to the frontend process
- Good, because Next.js natively handles `.env.local` — no extra tooling needed on the frontend
- Good, because adding future config (new API keys, feature flags) follows the established pattern
- Bad, because developers must maintain two separate env files — mitigated by committed `.example` files
- Bad, because `NEXT_PUBLIC_` prefix requirement means any frontend-visible var is effectively public — all truly sensitive vars must stay in `backend/.env`
- Follow-up: add `.env.example` files to repo with placeholder values and document in README

### Confirmation

`backend/.env` and `frontend/.env.local` must be in `.gitignore`. `backend/main.py` must call `load_dotenv()` at startup. No port, path, or API key may be hardcoded in source files. All `OPENAI_API_KEY` reads must go through the backend only.

## Pros and Cons of the Options

### Separate `.env` files per process

- Good, because clear ownership — each process manages its own secrets
- Good, because Next.js `.env.local` is loaded natively, no extra tooling
- Good, because frontend can never accidentally expose backend secrets
- Bad, because two files to maintain

### Single root-level `.env`

- Good, because one file to manage
- Bad, because both processes share the same file — backend secrets could be read by frontend build tooling
- Bad, because Next.js `.env.local` convention expects the file in the `frontend/` directory, requiring workaround

### Hardcoded defaults with environment variable overrides

- Good, because zero file setup for basic usage
- Bad, because secrets must still go somewhere — env vars without a file are set in the shell, which leaks into `ps` output and shell history
- Bad, because no discoverable list of supported configuration options

## More Information

`python-dotenv` must be added to `backend/requirements.txt`. Next.js loads `frontend/.env.local` automatically — no code change needed beyond using `process.env.NEXT_PUBLIC_API_URL`. See ADR-0001 for the database config values loaded via this pattern.
