# ADR Review Manifest

- Status: completed
- Review date: 2026-06-26

## Review Summary

ADR review completed for change `webui-light-mode-project-pdf-management`. All four in-force repository ADRs were reviewed. Three new durable architectural decisions were identified and recorded.

## In-Force ADRs Reviewed

- [ADR-0001](../../../adr/0001-sqlite-stdlib-no-orm.md) — Use SQLite via Python stdlib sqlite3 with No ORM. Confirmed: no ORM introduced. `annotations` table added via `CREATE TABLE IF NOT EXISTS` in `init_db()`, consistent with existing pattern.
- [ADR-0002](../../../adr/0002-per-project-file-layout.md) — Per-Project File Layout with Relative Paths in Database. Confirmed: upload endpoint writes to `uploads/{project_id}/{filename}`; `filepath` stored as relative path. Filename collision strategy (deferred by ADR-0002) resolved — see ADR-0007.
- [ADR-0003](../../../adr/0003-backend-owns-file-serving.md) — Backend Owns All File Serving. Confirmed: PDF viewer fetches `GET /files/{id}`, creates blob URL client-side; no file path or static URL crosses into the frontend.
- [ADR-0004](../../../adr/0004-dual-dotenv-config.md) — Dual .env Config. Confirmed: no new environment variables added to frontend. `backend/.env` unchanged. Pattern remains intact.

## New Durable ADRs Created

- [ADR-0005](../../../adr/0005-react-pdf-pdfjs-for-pdf-rendering.md) — Use react-pdf (pdfjs-dist) for In-Browser PDF Rendering. Establishes the PDF rendering library choice and the blob URL + worker configuration pattern.
- [ADR-0006](../../../adr/0006-annotation-coordinates-in-pdf-point-space.md) — Store Annotation Bounding Box Coordinates in PDF Point Space. Establishes that `x0, y0, x1, y1` are stored in PDF points (origin bottom-left), with frontend-side coordinate transform at draw time.
- [ADR-0007](../../../adr/0007-reject-duplicate-filenames-with-409.md) — Reject Duplicate Filenames Within a Project with HTTP 409. Resolves the collision strategy deferred by ADR-0002.
