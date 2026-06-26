---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
Supersedes: ""
---

# Reject Duplicate Filenames Within a Project with HTTP 409

## Context and Problem Statement

ADR-0002 established the per-project file layout (`uploads/{project_id}/{filename}`) and explicitly deferred the filename collision strategy. When a user uploads a file whose name already exists within the same project, the backend must decide what to do. The chosen strategy determines whether data loss is possible on re-upload and what the user workflow for intentional replacement looks like.

## Decision Drivers

- No silent data loss — overwriting an existing file without explicit user intent must not be possible
- Deterministic behaviour — the same upload attempt must always produce the same outcome
- Simplicity — the upload endpoint must not introduce rename logic or versioning at this stage
- User agency — the user must be in control of replacement by performing an explicit delete before re-uploading

## Considered Options

- Reject with HTTP 409 Conflict — user must delete the existing file first
- Overwrite silently — replace the file on disk and update the database record
- Rename with suffix/timestamp — store `{filename}-{timestamp}.pdf` on collision

## Decision Outcome

Chosen option: "Reject with HTTP 409 Conflict", because it is the only strategy that guarantees no silent data loss and requires no additional logic (timestamp generation, rename deduplication). The workflow for intentional replacement is explicit: delete the old file, then upload the new one.

The check is performed by querying the `files` table for an existing row with matching `project_id` and `filename` before writing any bytes to disk. If a match exists, the endpoint returns 409 immediately without touching the filesystem.

### Consequences

- Good, because no accidental overwrite of existing file data is possible
- Good, because the upload endpoint remains stateless with respect to versioning — no rename or version column needed
- Good, because the 409 response gives the frontend a clear signal to display a user-facing conflict message
- Bad, because replacing a file requires two steps (delete then upload) instead of one — friction for the common "update this drawing" workflow
- Follow-up: if intentional file replacement becomes a frequent workflow, consider a dedicated `PUT /files/{id}` replace endpoint that accepts a new file upload and atomically swaps the content; this does not require changing the collision strategy on `POST /projects/{id}/files`

### Confirmation

`POST /projects/{id}/files` MUST query `files` for `(project_id, filename)` before writing to disk. If a matching row exists, the response MUST be HTTP 409. No bytes MUST be written to disk for a 409 response. The frontend MUST surface the conflict as a visible error message to the user.

## Pros and Cons of the Options

### Reject with HTTP 409 Conflict

- Good, because no data loss risk
- Good, because simple to implement — one SELECT before the write
- Bad, because two-step replacement workflow adds user friction

### Overwrite silently

- Good, because single-step replacement workflow
- Bad, because existing file bytes are lost without any user confirmation
- Bad, because the database record's `uploaded_at` and `status` would need updating — adding write complexity

### Rename with suffix/timestamp

- Good, because preserves all versions on disk
- Bad, because the stored filename in the database diverges from the user-provided filename — confusing in the file list UI
- Bad, because introduces timestamp generation and uniqueness logic in the upload path
- Bad, because no version management UI exists to surface or clean up accumulated renamed copies

## More Information

See ADR-0002 for the file layout convention that this decision resolves. The `filepath` stored in the database uses the original user-provided filename — no server-side renaming occurs.

Revisit this decision if an explicit file versioning or replacement workflow is prioritised.
