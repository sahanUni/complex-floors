# Change Proposal: sqlite-db-fileserver-integration

## Why

The current backend uses hard-coded in-memory product data from a smoke test. The project is pivoting to floor plan analysis for Bill of Quantities (BOQ) generation, requiring persistent storage for project workspaces and uploaded drawing files.

## What Changes

- Replace in-memory `products` list with SQLite database
- Add `projects` table (id, name, description, created_at)
- Add `files` table (id, project_id, filename, filepath, file_type, uploaded_at, status)
- Seed database with sample project and associated file records
- Create local disk folder `uploads/` as file server root, organised as `uploads/{project-id}/{filename}`
- Add backend endpoints: `GET /projects`, `GET /projects/{id}/files`
- Update frontend to display project list and associated files instead of products
- Add `python-dotenv` to backend dependencies (`sqlite3` and `aiofiles` are stdlib)
- Add `backend/.env` and `frontend/.env.local` for all config (ports, paths, future API keys)
- Backend streams PDFs via `GET /files/{id}` — frontend never holds file paths

## Capabilities

### New Capabilities
- `project-management`: Create and list projects; each project is a workspace for a building/job containing multiple uploaded drawing files
- `file-storage`: Local disk folder serves as file server; files organised per-project under `uploads/{project-id}/`; DB records track metadata (filename, filepath, file_type, status)

### Modified Capabilities
- `product-listing`: **BREAKING** — removed entirely; replaced by project and file listing

## Impact

- **Backend**: `main.py` gains SQLite init, seed data, three GET endpoints (`/projects`, `/projects/{id}/files`, `/files/{id}` streaming); `requirements.txt` adds `python-dotenv`
- **File system**: `uploads/` directory created at backend root; seeded with placeholder files per sample project
- **Frontend**: `page.tsx` replaced with project/file display; `Product` interface removed
- **Future**: `files.status` field supports later analysis pipeline (pending → processing → complete); OpenAI GPT vision integration attaches to file records
