## 1. Environment Configuration

- [ ] 1.1 Create `backend/.env` with `PORT=8010`, `DB_PATH=./db.sqlite`, `UPLOAD_ROOT=./uploads`, `OPENAI_API_KEY=` (empty placeholder)
- [ ] 1.2 Create `backend/.env.example` as a committed copy with placeholder values (no real secrets)
- [ ] 1.3 Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8010` and `PORT=3010`
- [ ] 1.4 Create `frontend/.env.local.example` as a committed copy with placeholder values
- [ ] 1.5 Verify `.gitignore` at repo root ignores `backend/.env` and `frontend/.env.local` (add entries if missing)

## 2. Backend Dependencies

- [ ] 2.1 Add `python-dotenv` to `backend/requirements.txt`
- [ ] 2.2 Install updated dependencies: `pip install -r backend/requirements.txt`

## 3. SQLite Database Setup

- [ ] 3.1 Add `load_dotenv()` call at top of `backend/main.py`; read `DB_PATH`, `UPLOAD_ROOT`, `PORT` from env
- [ ] 3.2 Add `init_db()` function: `CREATE TABLE IF NOT EXISTS projects (id, name, description, created_at)`
- [ ] 3.3 Add `files` table to `init_db()`: `id, project_id, filename, filepath, file_type, uploaded_at, status DEFAULT 'pending'`; `filepath` stores relative `{project-id}/{filename}`
- [ ] 3.4 Add `seed_db()` function: inserts 2 sample projects with 2–3 file records each; runs only when `projects` table is empty
- [ ] 3.5 Wire `init_db()` and `seed_db()` to FastAPI startup event (`@app.on_event("startup")`)
- [ ] 3.6 Start backend and verify `db.sqlite` is created with seed data via `sqlite3 db.sqlite "SELECT * FROM projects;"`

## 4. File Server Setup

- [ ] 4.1 Create `backend/uploads/` directory (gitignored)
- [ ] 4.2 Add `uploads/` to `backend/.gitignore`
- [ ] 4.3 Ensure `seed_db()` also creates `uploads/{project-id}/` subdirectories and writes a placeholder `.pdf` file for each seeded file record
- [ ] 4.4 Verify file layout matches ADR-0002: `uploads/1/floor-plan-level-1.pdf`, `uploads/2/elevations.pdf` etc.

## 5. Backend Endpoints

- [ ] 5.1 Remove `products` list and `GET /products` endpoint from `main.py`
- [ ] 5.2 Add `GET /projects` → returns JSON array of all projects (`id`, `name`, `description`, `created_at`); empty array when no projects
- [ ] 5.3 Add `GET /projects/{id}/files` → returns JSON array of file metadata (`id`, `filename`, `file_type`, `uploaded_at`, `status`); **`filepath` must NOT appear in response**; returns HTTP 404 if project not found
- [ ] 5.4 Add `GET /files/{id}` → resolves `UPLOAD_ROOT + filepath` from DB; returns `StreamingResponse` with `media_type="application/pdf"`; HTTP 404 if record missing or file not on disk
- [ ] 5.5 Update CORS `allow_origins` to read frontend origin from env (e.g. `FRONTEND_ORIGIN=http://localhost:3010` in `backend/.env`)

## 6. Frontend Updates

- [ ] 6.1 Remove `Product` interface and products fetch from `frontend/src/app/page.tsx`
- [ ] 6.2 Add `Project` and `ProjectFile` TypeScript interfaces matching backend response shapes
- [ ] 6.3 Fetch `${process.env.NEXT_PUBLIC_API_URL}/projects` on page load; display project name and description for each project
- [ ] 6.4 Add interaction to select a project and fetch `${process.env.NEXT_PUBLIC_API_URL}/projects/{id}/files`; display filename, file type, and status for each file
- [ ] 6.5 Verify no hardcoded `localhost:8010` remains in frontend source — all API calls use `NEXT_PUBLIC_API_URL`

## 7. Validation

- [ ] 7.1 Run `openspec validate sqlite-db-fileserver-integration --type change --strict` and confirm no errors

## 8. Playwright Coverage

- [ ] 8.1 Bootstrap Playwright in `frontend/`: `npm init playwright@latest` (select TypeScript, `e2e/` dir, no GitHub Actions for now)
- [ ] 8.2 Add `test:e2e` script to `frontend/package.json`: `"test:e2e": "playwright test"`
- [ ] 8.3 Create `frontend/e2e/project-management.spec.ts`:
  - `test("Fetch all projects")` — GET `/projects` returns HTTP 200 with array containing `id`, `name`, `description`, `created_at`
  - `test("Empty project list")` — GET `/projects` with empty DB returns HTTP 200 and `[]`
  - `test("CORS allows frontend origin")` — response includes `Access-Control-Allow-Origin` header matching frontend origin
  - `test("Fetch files for existing project")` — GET `/projects/1/files` returns HTTP 200; response items contain `id`, `filename`, `file_type`, `uploaded_at`, `status`; `filepath` absent
  - `test("Fetch files for non-existent project")` — GET `/projects/999/files` returns HTTP 404
  - `test("Project list renders on page load")` — navigate to `/`; page displays project names and descriptions
  - `test("Selecting a project shows its files")` — navigate to `/`; select project; file list shows filename, file type, status
- [ ] 8.4 Create `frontend/e2e/file-storage.spec.ts`:
  - `test("Stream existing PDF file")` — GET `/files/1` returns HTTP 200 with `Content-Type: application/pdf`
  - `test("Request for non-existent file record")` — GET `/files/999` returns HTTP 404
  - `test("File record exists but file missing from disk")` — GET `/files/{id}` where file deleted returns HTTP 404
- [ ] 8.5 Run `npm run test:e2e` from `frontend/` and confirm all new specs pass
