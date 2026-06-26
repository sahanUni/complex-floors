---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Separate `extractions` Table Linked to `annotations` for Processed Outputs

## Context and Problem Statement

The system stores bounding box annotations as raw geometry (PDF-space coordinates per page per file). When a user confirms a labelled annotation, the backend must record: the category, label codes, note, SVG file path, extraction status, and timestamp. This metadata must be stored in the database. The question is whether to extend the existing `annotations` table or create a separate table.

## Decision Drivers

- Annotations must remain pure geometry — reusable for future purposes (measurements, overlays, LLM input) independent of extraction state
- Future changes will add PNG output, tiling, and potentially multiple extraction formats per annotation
- An unconfirmed annotation (drawn but not yet labelled) must be distinguishable from a confirmed, extracted one without nullable sentinel columns
- ADR-0001 (SQLite stdlib, no ORM) remains in force — schema changes are raw SQL

## Considered Options

- Separate `extractions` table with `annotation_id` foreign key
- Extend `annotations` table with nullable extraction columns

## Decision Outcome

Chosen option: "Separate `extractions` table", because it cleanly decouples raw geometry from processed outputs, eliminates nullable sentinel columns on `annotations`, and makes the one-annotation-to-many-extractions model (SVG now, PNG later) a natural table relationship rather than a schema migration.

Schema:
```sql
CREATE TABLE extractions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    annotation_id   INTEGER NOT NULL REFERENCES annotations(id),
    category        TEXT NOT NULL,
    label_code      TEXT NOT NULL,
    label_display   TEXT,
    note            TEXT,
    svg_path        TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    extracted_at    TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);
```

### Consequences

- Good, because `annotations` stays clean — geometry only, no nullable extraction state columns.
- Good, because future PNG extraction adds a new row (or new table) without altering `annotations` or `extractions`.
- Good, because unconfirmed annotations (no extraction record) are naturally represented — absence of a row, not a null status.
- Bad, because queries joining annotation geometry with extraction metadata require a JOIN — acceptable given SQLite's lightweight join performance at this scale.
- Bad, because cascade delete of a project must now also delete `extractions` rows — mitigated by the existing cascade pattern already in place for `annotations`.
- Follow-up: if PNG extraction is added, evaluate whether to add a `format` column to `extractions` (one row per format) or create a separate `extraction_outputs` table.

### Confirmation

Code review: `init_db()` must create the `extractions` table. Project delete cascade must delete `extractions` rows for all file annotations before deleting files and the project. `GET /projects/{id}/extractions` must JOIN `extractions` → `annotations` → `files` to filter by project.

## Pros and Cons of the Options

### Separate `extractions` table

- Good, because single-responsibility — geometry in `annotations`, outputs in `extractions`
- Good, because naturally supports one-to-many (annotation → multiple output formats)
- Good, because no nullable columns needed to represent unconfirmed state
- Bad, because JOIN required for project-level extraction queries
- Bad, because cascade delete logic must be extended to cover `extractions`

### Extend `annotations` table with nullable extraction columns

- Good, because simpler queries — annotation geometry and extraction metadata in one row
- Bad, because nullable `category`, `label_code`, `svg_path`, `status` columns on every annotation record — even unextracted ones
- Bad, because one-to-many (future PNG output) requires a second table anyway — deferred schema change costs more later
- Bad, because conflates two concerns: "where did the user draw" and "what did we extract"

## More Information

The `extractions` table is the canonical record of all processed outputs in this system. Future extraction formats (PNG tiles, DXF, etc.) should be anchored to this table or extend it — not added back to `annotations`.
