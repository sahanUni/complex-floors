# ADR Review Manifest

- Status: completed
- Review date: 2026-06-26

## Review Summary

ADR review completed for change `upload-progress-and-rect-removal`. All seven in-force repository ADRs were reviewed. One new durable architectural decision was identified and recorded.

## In-Force ADRs Reviewed

- [ADR-0001](../../../../adr/0001-sqlite-stdlib-no-orm.md) — SQLite via stdlib sqlite3, no ORM
- [ADR-0002](../../../../adr/0002-per-project-file-layout.md) — Per-project file layout with relative paths in DB
- [ADR-0003](../../../../adr/0003-backend-owns-file-serving.md) — Backend owns all file serving
- [ADR-0004](../../../../adr/0004-dual-dotenv-config.md) — Dual dotenv config for backend and frontend
- [ADR-0005](../../../../adr/0005-react-pdf-pdfjs-for-pdf-rendering.md) — react-pdf / pdfjs-dist for PDF rendering
- [ADR-0006](../../../../adr/0006-annotation-coordinates-in-pdf-point-space.md) — Annotation coordinates in PDF point space
- [ADR-0007](../../../../adr/0007-reject-duplicate-filenames-with-409.md) — Reject duplicate filenames with HTTP 409

No existing ADRs are superseded by this change.

## New Durable ADRs Created

- [ADR-0008](../../../../adr/0008-xhr-for-upload-progress.md) — Use XMLHttpRequest for file uploads requiring progress feedback. Establishes XHR with `upload.onprogress` as the codebase pattern for upload progress; `fetch` cannot fire upload-side progress events.

## Decisions Not Recorded as ADRs

- Status label mapping (`pending` → `"Uploaded"`) — frontend display detail, not a long-term architectural commitment.
- Draw/Select toolbar mode prop pattern — component-level implementation detail following standard React patterns.
- `confirm()` dialog for annotation deletion — tactical UX choice with no cross-cutting impact.
- `DELETE /annotations/{id}` REST endpoint — follows existing REST patterns in `main.py`; no new architectural pattern introduced.
