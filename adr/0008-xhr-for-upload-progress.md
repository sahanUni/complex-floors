---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Use XMLHttpRequest for File Uploads Requiring Progress Feedback

## Context and Problem Statement

The upload modal needs to show a percentage progress bar while PDF files are being transferred to the backend. The existing implementation uses the Fetch API (`fetch`), which does not expose upload progress events. A replacement mechanism is needed that provides byte-level progress callbacks without introducing new runtime dependencies.

## Decision Drivers

- Must expose upload progress as bytes transferred / total bytes to render a percentage bar
- Must work in the same browser environment as the existing Next.js client components
- Must not introduce new npm dependencies
- Must remain compatible with the existing FastAPI multipart endpoint (`POST /projects/{id}/files`)

## Considered Options

- XMLHttpRequest with `upload.onprogress`
- Fetch API with ReadableStream (response body streaming)
- Chunked upload with multiple sequential `fetch` calls
- Third-party upload library (e.g., `tus-js-client`, `axios`)

## Decision Outcome

Chosen option: "XMLHttpRequest with `upload.onprogress`", because it is the only browser-native mechanism that fires progress events on the *request* (upload) side, requires no new dependencies, and integrates directly with `FormData` exactly as the existing `fetch` call does.

### Consequences

- Good, because `XMLHttpRequest.upload.onprogress` provides `loaded` and `total` byte counts — percentage is calculable without any server-side changes.
- Good, because FastAPI includes `Content-Length` on multipart responses, so `total` is always non-zero and percentage is reliable.
- Good, because no new npm dependency is introduced.
- Bad, because XHR is a more verbose API than `fetch` — error handling and response parsing require more boilerplate.
- Bad, because XHR does not return a Promise natively — the upload must be wrapped manually or via a helper.
- Follow-up: if `Content-Length` is ever stripped (e.g., by an nginx proxy), `total` will be 0 and the implementation must fall back to an indeterminate indicator.

### Confirmation

Code review: `UploadModal` must use `new XMLHttpRequest()` with `xhr.upload.addEventListener('progress', ...)`. No `fetch` call should remain for the upload path.

## Pros and Cons of the Options

### XMLHttpRequest with `upload.onprogress`

Browser-native API available in all modern browsers without any import.

- Good, because fires progress events on the upload (request) side, not the download (response) side
- Good, because zero new dependencies
- Bad, because verbose — requires manual Promise wrapping and explicit error handling

### Fetch API with ReadableStream (response body streaming)

`fetch` exposes `response.body` as a `ReadableStream`, but this is the *response* body — it gives download progress, not upload progress.

- Bad, because does not expose upload-side progress events — cannot track how many bytes have been sent to the server
- Neutral, because modern and ergonomic for response handling

### Chunked upload with multiple sequential `fetch` calls

Split the file into N chunks and track how many chunks have been sent.

- Good, because works with `fetch` and enables resumable uploads
- Bad, because requires server-side reassembly logic — significant backend change
- Bad, because over-engineered for a single-user local tool at this stage

### Third-party upload library (e.g., `tus-js-client`, `axios`)

- Good, because `axios` exposes `onUploadProgress` with minimal boilerplate
- Bad, because introduces a new npm dependency for a feature XHR handles natively
- Bad, because `tus` requires a tus-compatible server endpoint — incompatible with the existing FastAPI endpoint

## More Information

This decision applies to all future upload flows in this codebase that require progress feedback. If a new upload endpoint is added and progress is needed, use XHR following the same pattern established in `UploadModal`.

Revisit if the project moves to a chunked or resumable upload model (e.g., large files, unreliable connections) — at that point a dedicated upload library would be the right choice.
