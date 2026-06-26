## Why

WebUI currently switches to a near-invisible dark theme on dark-OS systems, and lacks project creation/deletion, file upload, and PDF viewing. These are blockers to basic daily use and to the planned floor-plan annotation pipeline (bounding box → PyMuPDF extraction → GPT vision → wall reconstruction).

## What Changes

- Remove all `@media (prefers-color-scheme: dark)` overrides in `globals.css` and `page.module.css` — force always-light.
- Add **Create Project** form (name + description) and `POST /projects` backend endpoint.
- Add **Delete Project** with cascade hard-delete: DB rows (`projects`, `files`, `annotations`), uploaded files on disk, `DELETE /projects/{id}` endpoint.
- Add **Multi-file PDF upload** per project (PDF-only, MIME + extension validated front and back), `POST /projects/{id}/files` endpoint.
- Add **PDF Viewer** using `react-pdf` (pdfjs-dist) — renders pages to canvas with page navigation and zoom.
- Add **Bounding Box Drawing** — SVG overlay on the viewer canvas; user draws boxes on PDF pages.
- Add **Annotation Persistence** — drawn box coordinates stored in new `annotations` table (`file_id`, `page`, `x0`, `y0`, `x1`, `y1` in PDF units); `POST /files/{file_id}/annotations` and `GET /files/{file_id}/annotations` endpoints.
- Expand backend CORS to allow `POST`, `DELETE` methods (currently GET-only).

## Capabilities

### New Capabilities

- `light-mode-ui`: Force always-light theme by removing dark-mode media query overrides across all CSS files.
- `project-management`: Create a project (name + description) and delete a project with full cascade — DB records, uploaded files on disk, and associated annotations.
- `file-upload`: Upload one or more PDF files to a project; validated for PDF MIME type and `.pdf` extension on both client and server; stored to `./uploads/{project_id}/` on disk and recorded in `files` table.
- `pdf-viewer`: View an uploaded PDF in-browser using `react-pdf`; supports page navigation and zoom; renders each page to canvas via pdfjs-dist.
- `annotation-drawing`: Draw rectangular bounding boxes on a PDF page via SVG overlay; boxes are persisted per file per page to the `annotations` table for future extraction use.

### Modified Capabilities

- None.

## Impact

**Frontend:**
- `frontend/src/app/globals.css` — remove dark-mode media query block.
- `frontend/src/app/page.module.css` — remove dark-mode media query block.
- `frontend/src/app/page.tsx` — add Create Project form; convert from pure server component to support mutation.
- `frontend/src/app/ProjectList.tsx` — add Delete button per project, Upload button per project, file row click → PDF viewer.
- New components: `PdfViewer.tsx` (react-pdf canvas + SVG overlay), `AnnotationLayer.tsx` (box drawing logic), `UploadModal.tsx`.
- New dependency: `react-pdf` (pdfjs-dist).

**Backend (`backend/main.py`):**
- New table: `annotations` (`id`, `file_id`, `page`, `x0`, `y0`, `x1`, `y1`, `created_at`).
- New endpoints: `POST /projects`, `DELETE /projects/{id}`, `POST /projects/{id}/files`, `POST /files/{file_id}/annotations`, `GET /files/{file_id}/annotations`.
- CORS: add `POST`, `DELETE` to `allow_methods`.
- New dependency: `python-multipart` (FastAPI file upload).
