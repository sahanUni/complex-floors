# ADR Review Manifest

- Status: completed
- Review date: 2026-06-26

## Review Summary

ADR review completed for change `sqlite-db-fileserver-integration`. No prior ADRs existed in the repository. Four durable architectural decisions were identified from `design.md` and captured as new repository-level ADR files.

## In-Force ADRs Reviewed

- None — `<repo>/adr/` had no in-force ADRs prior to this change.

## New Durable ADRs Created

- [ADR-0001](../../../../adr/0001-sqlite-stdlib-no-orm.md) — Use SQLite via Python stdlib `sqlite3` with no ORM
- [ADR-0002](../../../../adr/0002-per-project-file-layout.md) — Per-project file layout with relative paths in database
- [ADR-0003](../../../../adr/0003-backend-owns-file-serving.md) — Backend owns all file serving; frontend never holds file paths
- [ADR-0004](../../../../adr/0004-dual-dotenv-config.md) — Dual `.env` config: separate environment files for backend and frontend
