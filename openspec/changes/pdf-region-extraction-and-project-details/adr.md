# ADR Review Manifest

- Status: completed
- Review date: 2026-06-26

## Review Summary

ADR review completed for this change. Four in-force ADRs were directly relevant to design decisions. Four new repository-level ADRs were created capturing durable architectural commitments introduced by this change.

## In-Force ADRs Reviewed

- ADR-0001: SQLite via Python stdlib sqlite3, no ORM — `extractions` table added via raw SQL in `init_db()`, consistent with this decision.
- ADR-0002: Per-project file layout with relative paths — SVG storage at `uploads/{project_id}/extractions/{annotation_id}.svg` extends this layout; `extractions.svg_path` stores relative path.
- ADR-0003: Backend owns all file serving — new `GET /extractions/{id}` endpoint streams SVG bytes; frontend receives opaque extraction IDs only.
- ADR-0006: Annotation coordinates in PDF point space — PyMuPDF `fitz.Rect(x0, y0, x1, y1)` accepts PDF-space coordinates directly; no conversion at extraction time.

## New Durable ADRs Created

- [ADR-0009](../../../adr/0009-pymupdf-for-pdf-region-extraction.md): Use PyMuPDF (fitz) for server-side PDF region extraction.
- [ADR-0010](../../../adr/0010-separate-extractions-table.md): Separate `extractions` table linked to `annotations` for processed outputs.
- [ADR-0011](../../../adr/0011-svg-first-extraction-format.md): SVG as the first extraction output format — PNG and tiling deferred.
- [ADR-0012](../../../adr/0012-floor-plan-level-code-enum.md): Fixed floor plan level code enum (B01–L05) as canonical internal key.
