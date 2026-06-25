---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Per-Project File Layout with Relative Paths in Database

## Context and Problem Statement

Uploaded drawing files (PDFs) must be stored on the local disk and tracked in the database. We need a folder layout that is self-contained, portable across machines, and maps cleanly to the project hierarchy. The database must record enough information to locate each file without coupling to absolute paths.

## Decision Drivers

- Files must be grouped by project for easy browsing, backup, and deletion
- Storage layout must be portable — absolute paths break across machines
- Database must be the single source of truth for file metadata
- Layout must support future upload and analysis pipeline without restructuring

## Considered Options

- Per-project subdirectories: `uploads/{project-id}/{filename}`
- Flat uploads with prefixed filenames: `uploads/{project-id}-{filename}`
- Content-addressed storage: `uploads/{sha256-hash}`

## Decision Outcome

Chosen option: "Per-project subdirectories: `uploads/{project-id}/{filename}`", because it maps directly to the project hierarchy, makes per-project management (delete, backup) trivial, and is immediately intuitive when browsing the filesystem.

The database `files.filepath` column stores the **relative path** `{project-id}/{filename}`. The backend joins this with the `UPLOAD_ROOT` environment variable to resolve the absolute path at runtime.

### Consequences

- Good, because per-project folder structure matches the domain model
- Good, because deleting a project's files is `rm -rf uploads/{id}/`
- Good, because relative paths survive machine migrations and repo clones
- Bad, because filename collisions within a project must be handled (two files with the same name in one project) — mitigation: append a suffix or timestamp at upload time (deferred to upload change)
- Follow-up: upload endpoint must enforce uniqueness or rename on collision within a project folder

### Confirmation

`files.filepath` in the DB must match the pattern `{project-id}/{filename}` (no leading slash, no absolute path). Backend file resolution must use `os.path.join(UPLOAD_ROOT, filepath)`.

## Pros and Cons of the Options

### Per-project subdirectories: `uploads/{project-id}/{filename}`

- Good, because mirrors project hierarchy in the filesystem
- Good, because trivial per-project bulk operations
- Neutral, because requires creating subdirectory on project creation or first upload
- Bad, because filename collision within a project requires handling

### Flat uploads with prefixed filenames: `uploads/{project-id}-{filename}`

- Good, because single directory — no subdirectory management
- Bad, because prefix parsing is fragile; breaks if project-id or filename contain hyphens
- Bad, because bulk per-project operations require filtering, not simple directory traversal

### Content-addressed storage: `uploads/{sha256-hash}`

- Good, because deduplication is free
- Bad, because loses human-readable structure entirely
- Bad, because requires hash computation on upload and more complex retrieval logic
- Bad, because overkill for a local single-user tool

## More Information

`UPLOAD_ROOT` defaults to `./uploads` (relative to backend working directory) if not set in `backend/.env`. See ADR-0004 for the `.env` configuration pattern.
