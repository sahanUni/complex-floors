---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Backend Owns All File Serving — Frontend Never Holds File Paths

## Context and Problem Statement

The frontend needs to allow users to view or download uploaded PDF drawings. We need to decide where file resolution and serving happens: in the backend (opaque file IDs) or in the frontend (file paths or static URLs). This choice sets a long-term boundary between the two layers.

## Decision Drivers

- Storage layout must not leak into the frontend — it is an internal backend concern
- Future changes to storage location (local disk → S3, different folder layout) must not require frontend changes
- Security: direct static file URLs bypass backend auth logic if auth is added later
- Simplicity: a single place handles file resolution and content-type negotiation

## Considered Options

- Backend streams file bytes via `GET /files/{id}` (`StreamingResponse`)
- Backend returns a static file URL for the frontend to fetch directly
- Frontend resolves file path from `filepath` field in the API response

## Decision Outcome

Chosen option: "Backend streams file bytes via `GET /files/{id}`", because it fully encapsulates the storage layer inside the backend. The frontend requests a file by opaque database ID and receives bytes with the correct `Content-Type`. Storage location, folder structure, and resolution logic are invisible to the frontend.

`filepath` is **not** included in `GET /projects/{id}/files` API responses.

### Consequences

- Good, because storage layout changes (folder rename, cloud migration) require no frontend changes
- Good, because future auth middleware on `GET /files/{id}` protects all file access in one place
- Good, because `Content-Type` and `Content-Disposition` are set correctly by the backend for all file types
- Bad, because large files stream through the FastAPI process — a bottleneck if files are large and concurrent access grows
- Bad, because frontend cannot use browser-native `<embed src="...">` with a static URL; must proxy through the API
- Follow-up: if PDF preview in the browser is required, the frontend fetches `/files/{id}` bytes and creates a blob URL client-side

### Confirmation

`GET /projects/{id}/files` response schema must not include a `filepath` field. `GET /files/{id}` must return `StreamingResponse` with `media_type="application/pdf"`. Frontend code must not construct file paths or static URLs.

## Pros and Cons of the Options

### Backend streams via `GET /files/{id}`

- Good, because storage is fully encapsulated
- Good, because auth, logging, and content-type logic live in one place
- Bad, because all file traffic passes through the FastAPI process
- Bad, because browser PDF embed requires a blob URL workaround on the frontend

### Backend returns static file URL

- Good, because browser can load file directly without proxying
- Bad, because exposes storage path structure to the frontend
- Bad, because bypasses backend auth if added later
- Bad, because URL breaks when storage location changes

### Frontend resolves filepath from API response

- Good, because trivial to implement
- Bad, because couples frontend directly to backend storage layout
- Bad, because completely breaks if storage moves off local disk

## More Information

See ADR-0002 for the file layout decision. When PDF preview is implemented, the frontend should fetch `/files/{id}` and use `URL.createObjectURL()` to create a temporary blob URL for `<embed>` or `<iframe>`.
