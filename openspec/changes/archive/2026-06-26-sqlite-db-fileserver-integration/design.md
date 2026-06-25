# Design: sqlite-db-fileserver-integration

## Context

Backend currently serves hard-coded in-memory products from a smoke test. The project pivots to floor plan analysis for Bill of Quantities (BOQ) generation. This design covers the storage foundation only: SQLite database and local disk file server. Vision analysis (OpenAI GPT) is a future change.

**Current state:** `main.py` has a `products` list; no persistence, no file storage.
**Stakeholders:** Single developer, local dev environment.

### C1 — System Context

```
┌──────────────────────────────────────────────────────┐
│               Floor Plan Analysis System              │
│                                                      │
│   ┌──────────────┐        ┌────────────────────┐    │
│   │   Architect  │───────▶│   Analysis System  │    │
│   │   / QS User  │        │  (Upload PDFs,     │    │
│   └──────────────┘        │   view projects)   │    │
│                           └────────────────────┘    │
│                                    │ [future]        │
└────────────────────────────────────┼────────────────┘
                                     ▼
                          ┌─────────────────────┐
                          │  OpenAI GPT Vision  │
                          │  (BOQ extraction)   │
                          └─────────────────────┘
```

### C2 — Container

```
┌──────────────────────────────────────────────────────────────────┐
│                    Floor Plan Analysis System                      │
│                                                                    │
│  ┌────────────────┐   HTTP/JSON    ┌───────────────────────────┐  │
│  │  Next.js App   │───────────────▶│     FastAPI Backend       │  │
│  │  (SSR pages)   │                │   GET /projects           │  │
│  │  :3010         │◀───────────────│   GET /projects/{id}/files│  │
│  └────────────────┘                └────────────┬──────────────┘  │
│                                                 │                  │
│                                    ┌────────────┴────────────┐    │
│                                    │                         │    │
│                           ┌────────▼──────┐    ┌────────────▼──┐ │
│                           │  SQLite DB    │    │  Local Disk   │ │
│                           │  db.sqlite    │    │  File Server  │ │
│                           │               │    │ uploads/      │ │
│                           │  projects     │    │  {project-id}/│ │
│                           │  files        │    │    *.pdf      │ │
│                           └───────────────┘    └───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- Replace in-memory products with SQLite-backed projects and files
- Establish local disk folder as file server (`uploads/{project-id}/`)
- Seed sample data: 1-2 projects with associated file records and placeholder files on disk
- Expose `GET /projects` and `GET /projects/{id}/files` endpoints
- Display project list and file list in Next.js frontend

**Non-Goals:**
- File upload endpoint (`POST /projects/{id}/files`) — seeded data only for now
- PDF streaming or preview in frontend
- Authentication or multi-user support
- OpenAI GPT vision integration
- Production deployment

## Decisions

### 1. SQLite via Python stdlib `sqlite3`
**Choice:** Use Python's built-in `sqlite3` — no ORM, no migration framework.
**Rationale:** Minimal dependencies, zero config, sufficient for single-user local dev. Adding SQLAlchemy or Alembic would be over-engineering at this stage.
**Alternative considered:** SQLAlchemy Core — rejected; adds dependency and abstraction for no gain at this scale.

### 2. DB file location: `backend/db.sqlite`
**Choice:** Place `db.sqlite` at the backend root alongside `main.py`.
**Rationale:** Keeps storage co-located with process. Gitignored. Easy to delete and reseed.
**Alternative considered:** In-memory SQLite (`:memory:`) — rejected; data lost on restart, defeats persistence goal.

### 3. File storage root: `backend/uploads/{project-id}/`
**Choice:** Relative to backend process working directory.
**Rationale:** Self-contained, portable across dev machines. `files.filepath` stores relative path only; backend joins with `UPLOAD_ROOT` env var (defaulting to `./uploads`) to get absolute path.
**Alternative considered:** Absolute path hardcoded — rejected; breaks across machines.

### 4. DB schema
```sql
CREATE TABLE projects (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    filename    TEXT NOT NULL,
    filepath    TEXT NOT NULL,  -- relative: {project-id}/{filename}
    file_type   TEXT,           -- 'floor-plan', 'elevation', 'section', 'spec'
    uploaded_at TEXT DEFAULT (datetime('now')),
    status      TEXT DEFAULT 'pending'  -- pending | processing | complete
);
```
`status` field is the hook point for future OpenAI GPT vision pipeline.

### 5. DB init on startup
**Choice:** `CREATE TABLE IF NOT EXISTS` + seed check on FastAPI startup event.
**Rationale:** No migration tooling needed. Idempotent — safe to restart without wiping data.

### 6. Remove products endpoint
**Choice:** Delete `GET /products` and the `products` list entirely.
**Rationale:** Smoke test artefact, no longer needed. BREAKING — frontend must be updated simultaneously.

### 7. PDF streaming via backend (`GET /files/{id}`)
**Choice:** Backend streams file bytes directly; frontend never holds file paths or static URLs.
**Rationale:** Keeps file system fully encapsulated in backend. Frontend requests `GET /files/{id}` and receives a `StreamingResponse` with correct `Content-Type: application/pdf`. No CORS-exposed file paths, no frontend knowledge of `uploads/` structure.
**Alternative considered:** Returning a static URL/path to frontend — rejected; leaks storage layout and requires frontend to handle file resolution.

### 8. Environment configuration via `.env` files
**Choice:** Two separate `.env` files — `backend/.env` and `frontend/.env.local`.
**Rationale:** Each process owns its config. Backend needs `UPLOAD_ROOT`, `DB_PATH`, `OPENAI_API_KEY` (future), `PORT`. Frontend needs `NEXT_PUBLIC_API_URL`. Avoids hardcoded values everywhere and sets up the config pattern for future secrets.

**`backend/.env`:**
```
PORT=8010
DB_PATH=./db.sqlite
UPLOAD_ROOT=./uploads
OPENAI_API_KEY=         # populated when vision change lands
```

**`frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8010
PORT=3010
```

Backend loads via `python-dotenv`. Frontend loaded natively by Next.js.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SQLite write contention under concurrent requests | Acceptable for single-user local dev; not a concern now |
| `uploads/` grows unbounded with no cleanup | No upload endpoint in this change; seeded files are small placeholders |
| Hardcoded seed data becomes stale | Seed runs only when DB is empty; delete `db.sqlite` to reseed |
| Frontend breaks if backend not running | Expected in local dev; no fallback needed |

## Migration Plan

1. Stop backend
2. Delete `backend/db.sqlite` if it exists (fresh start)
3. Deploy updated `main.py` — startup creates tables and seeds data
4. Create `backend/uploads/` folder structure with placeholder files
5. Start backend — verify `GET /projects` returns seed data
6. Start frontend — verify project list renders

**Rollback:** Restore previous `main.py` from git. No DB migration to undo.

## Open Questions

_None. Both previously open questions resolved — see Decisions 7 and 8._
