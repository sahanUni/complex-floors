## 1. Backend: Schema & Config

- [x] 1.1 Add `annotations` table to `init_db()` in `backend/main.py` — columns: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `file_id INTEGER NOT NULL REFERENCES files(id)`, `page INTEGER NOT NULL`, `x0 REAL`, `y0 REAL`, `x1 REAL`, `y1 REAL`, `created_at TEXT DEFAULT (datetime('now'))`
- [x] 1.2 Expand `CORSMiddleware` `allow_methods` from `["GET"]` to `["GET", "POST", "DELETE"]`
- [x] 1.3 Add `python-multipart` to `backend/requirements.txt`

## 2. Backend: Project Endpoints

- [x] 2.1 Implement `POST /projects` — accept JSON body `{name, description}`, insert into `projects`, return 201 with `{id, name, description, created_at}`; return 422 if `name` is missing
- [x] 2.2 Implement `DELETE /projects/{id}` — return 404 if project not found; otherwise: fetch all `files.filepath` for project, delete `annotations` rows for those file IDs, delete `files` rows, delete `projects` row, call `shutil.rmtree(uploads/{project_id}/, ignore_errors=True)`; return 200

## 3. Backend: File Upload Endpoint

- [x] 3.1 Implement `POST /projects/{id}/files` — accept `multipart/form-data` with one or more file fields; return 404 if project not found
- [x] 3.2 Validate each file: MIME type must be `application/pdf` and filename must end in `.pdf`; return 400 if either check fails without writing any bytes to disk
- [x] 3.3 Before writing each file, query `files` for existing row with matching `(project_id, filename)`; return 409 if found without writing to disk
- [x] 3.4 Write valid, non-duplicate files to `uploads/{project_id}/{filename}` (create directory if needed); insert `files` rows with `status=pending`; return 201 with array of created file records

## 4. Backend: Annotation Endpoints

- [x] 4.1 Implement `GET /files/{file_id}/annotations` — return 404 if file not found; return 200 with JSON array of `{id, file_id, page, x0, y0, x1, y1, created_at}` (empty array if none)
- [x] 4.2 Implement `POST /files/{file_id}/annotations` — return 404 if file not found; accept JSON body `{page, x0, y0, x1, y1}` (PDF point space); insert into `annotations`; return 201 with created record

## 5. Frontend: Light Mode

- [x] 5.1 Remove `@media (prefers-color-scheme: dark)` block from `frontend/src/app/globals.css` (includes `color-scheme: dark` rule)
- [x] 5.2 Remove `@media (prefers-color-scheme: dark)` block from `frontend/src/app/page.module.css` (includes `.logo` invert and `.page` dark overrides)

## 6. Frontend: Dependencies & Worker Setup

- [x] 6.1 Run `npm install react-pdf` in `frontend/`
- [x] 6.2 Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `frontend/public/pdf.worker.min.mjs`
- [x] 6.3 Create a client component (e.g. `PdfWorkerInit.tsx`) that sets `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'` and import it in `layout.tsx`

## 7. Frontend: Project Management UI

- [x] 7.1 Add Create Project form to project list page — fields: `name` (required), `description` (optional); disable submit if name is empty
- [x] 7.2 On form submit, call `POST /projects`; on success append new project to list without full page reload; clear form
- [x] 7.3 Add Delete button to each project row in `ProjectList.tsx`; on click show inline confirmation; on confirm call `DELETE /projects/{id}`; remove project from list on success

## 8. Frontend: File Upload UI

- [x] 8.1 Create `UploadModal.tsx` — file input with `accept=".pdf"` and `multiple`; validate each selected file client-side (extension `.pdf` and `type === 'application/pdf'`); show error for invalid files before submit
- [x] 8.2 On submit, `POST /projects/{id}/files` with `FormData` containing selected files
- [x] 8.3 Handle 400 response with user-facing error ("Only PDF files are accepted")
- [x] 8.4 Handle 409 response with user-facing error showing the conflicting filename
- [x] 8.5 On success refresh the file list for the current project; close modal
- [x] 8.6 Add Upload button to each expanded project panel in `ProjectList.tsx` that opens `UploadModal`

## 9. Frontend: PDF Viewer

- [x] 9.1 Create `PdfViewer.tsx` — on mount fetch `GET /files/{file_id}` as `arrayBuffer()`, create `Blob` with `type: 'application/pdf'`, create blob URL via `URL.createObjectURL`, pass to `react-pdf <Document>`; revoke blob URL on unmount
- [x] 9.2 Render the current page using `<Page pageNumber={page} scale={scale} onLoadSuccess={onPageLoadSuccess}>`; store page dimensions `{width, height}` in PDF points from `onPageLoadSuccess`
- [x] 9.3 Add page navigation controls: Previous (disabled on page 1), Next (disabled on last page), display "Page N of M"
- [x] 9.4 Add zoom controls: Zoom In (increment `scale`), Zoom Out (decrement `scale`, min 0.5); default scale 1.0
- [x] 9.5 Open `PdfViewer` when user clicks a file row in `ProjectList.tsx` (pass `file.id`); allow closing the viewer

## 10. Frontend: Annotation Drawing

- [x] 10.1 Create `AnnotationLayer.tsx` — SVG element absolutely positioned over the page canvas, matching its rendered pixel dimensions
- [x] 10.2 Implement `mousedown`/`mousemove`/`mouseup` handlers on the SVG: track start/end coords in screen pixels; render a live `<rect>` during drag; finalise box on `mouseup`
- [x] 10.3 Implement coordinate transform on box finalisation: `pdf_x = (screen_x / rendered_width_px) * page_width_pt`; `pdf_y = page_height_pt - (screen_y / rendered_height_px) * page_height_pt` (ADR-0006; flip Y axis)
- [x] 10.4 On box finalise, call `POST /files/{file_id}/annotations` with `{page, x0, y0, x1, y1}` in PDF points; add returned annotation to local state
- [x] 10.5 On viewer open, call `GET /files/{file_id}/annotations`; convert stored PDF-point coords back to screen pixels for display (`screen_x = (pdf_x / page_width_pt) * rendered_width_px`; Y flipped); render existing boxes as `<rect>` elements
- [x] 10.6 Mount `AnnotationLayer` inside `PdfViewer` above the `<Page>` canvas; re-render overlay on page or zoom change with updated dimensions

## 11. Validation

- [x] 11.1 Run `openspec validate webui-light-mode-project-pdf-management --type change --strict` and confirm no errors

## 12. Playwright Coverage

- [x] 12.1 `light-mode-ui` — "Light theme on dark-OS system": emulate dark colour scheme, navigate to `/`, assert background is light
- [x] 12.2 `light-mode-ui` — "Light theme on light-OS system": emulate light colour scheme, navigate to `/`, assert background is light
- [x] 12.3 `light-mode-ui` — "No dark media query override": load page CSS, assert no `prefers-color-scheme: dark` rule exists in any loaded stylesheet
- [x] 12.4 `project-management` — "Create project with valid data": POST `/projects` with name + description, assert 201 and returned id
- [x] 12.5 `project-management` — "Create project with missing name": POST `/projects` with empty body, assert 422
- [x] 12.6 `project-management` — "Delete existing project cascades all data": create project + upload file + save annotation, DELETE `/projects/{id}`, assert 200, verify project/files/annotations absent in DB, verify uploads dir deleted
- [x] 12.7 `project-management` — "Delete non-existent project": DELETE `/projects/99999`, assert 404
- [x] 12.8 `project-management` — "User creates a project": fill create form, submit, assert new project appears in list without reload
- [x] 12.9 `project-management` — "Create form requires name": submit create form with empty name, assert form does not submit
- [x] 12.10 `project-management` — "User deletes a project": click delete on a project, confirm, assert project removed from list
- [x] 12.11 `project-management` — "Project list renders on page load": navigate to `/`, assert project names and descriptions visible, assert create control visible, assert delete control visible per project
- [x] 12.12 `project-management` — "Selecting a project shows its files": click a project, assert file list with filename, type, status
- [x] 12.13 `file-upload` — "Upload single valid PDF": POST multipart to `/projects/{id}/files` with a PDF, assert 201 and file record returned
- [x] 12.14 `file-upload` — "Upload multiple PDFs in one request": POST multipart with two PDFs, assert 201 and two records returned
- [x] 12.15 `file-upload` — "Reject non-PDF file by MIME type": POST multipart with `text/plain` file, assert 400 and no file on disk
- [x] 12.16 `file-upload` — "Reject non-PDF file by extension": POST multipart with `.docx` file, assert 400
- [x] 12.17 `file-upload` — "Reject duplicate filename in same project": upload PDF, upload same filename again, assert 409
- [x] 12.18 `file-upload` — "Upload to non-existent project": POST to `/projects/99999/files`, assert 404
- [x] 12.19 `file-upload` — "User uploads PDF files to a project": open upload modal, select PDF, submit, assert file appears in file list
- [x] 12.20 `file-upload` — "Frontend restricts file picker to PDFs": inspect upload input, assert `accept=".pdf"` attribute
- [x] 12.21 `file-upload` — "Frontend rejects non-PDF selection": attempt to submit non-PDF via input, assert error visible and no request sent
- [x] 12.22 `file-upload` — "Duplicate filename shown as error": upload existing filename, assert 409 error message visible in UI
- [x] 12.23 `pdf-viewer` — "User opens a PDF file for viewing": click file row, assert PDF viewer opens and first page renders
- [x] 12.24 `pdf-viewer` — "PDF fetched via backend stream endpoint": intercept network, click file, assert request to `/files/{id}` made with correct headers; assert no static filepath in request
- [x] 12.25 `pdf-viewer` — "PDF with multiple pages shows page count": open multi-page PDF, assert page indicator shows "Page 1 of N" with N > 1
- [x] 12.26 `pdf-viewer` — "Navigate to next page": click next-page, assert page indicator advances to 2
- [x] 12.27 `pdf-viewer` — "Navigate to previous page": navigate to page 2, click previous-page, assert page indicator returns to 1
- [x] 12.28 `pdf-viewer` — "Previous control disabled on first page": open viewer on page 1, assert previous control is disabled
- [x] 12.29 `pdf-viewer` — "Next control disabled on last page": navigate to last page, assert next control is disabled
- [x] 12.30 `pdf-viewer` — "Zoom in increases rendered page size": record canvas width, click zoom-in, assert canvas width increased
- [x] 12.31 `pdf-viewer` — "Zoom out decreases rendered page size": zoom in first, click zoom-out, assert canvas width decreased
- [x] 12.32 `annotation-drawing` — "User draws a bounding box": drag mouse on PDF page, assert rectangle appears on overlay
- [x] 12.33 `annotation-drawing` — "Multiple boxes on same page": draw two boxes, assert both rectangles visible
- [x] 12.34 `annotation-drawing` — "Boxes persist across page navigation": draw box on page 1, navigate to page 2, navigate back to page 1, assert box still visible
- [x] 12.35 `annotation-drawing` — "SVG overlay matches canvas dimensions": assert SVG overlay bounding rect equals page canvas bounding rect at multiple zoom levels
- [x] 12.36 `annotation-drawing` — "Coordinates stored in PDF units": draw box at 100% zoom, record stored coords via GET annotations; draw same region at 200% zoom, assert stored coords are equal
- [x] 12.37 `annotation-drawing` — "Save annotation for a file page": POST `/files/{id}/annotations` with `{page:1, x0, y0, x1, y1}`, assert 201 and returned record matches input
- [x] 12.38 `annotation-drawing` — "Retrieve annotations for a file": create two annotations, GET `/files/{id}/annotations`, assert array length 2 with correct fields
- [x] 12.39 `annotation-drawing` — "Retrieve annotations for file with none saved": GET `/files/{id}/annotations` for file with no annotations, assert 200 empty array
- [x] 12.40 `annotation-drawing` — "Save annotation for non-existent file": POST `/files/99999/annotations`, assert 404
- [x] 12.41 `annotation-drawing` — "Existing annotations visible on viewer open": save annotation via API, open viewer for that file, assert box rendered on overlay
- [x] 12.42 `annotation-drawing` — "No annotations shows blank overlay": open viewer for file with no annotations, assert overlay empty

## 13. Final Verification

- [x] 13.1 Run `npm run test:e2e` in `frontend/` and confirm all 42 new Playwright specs pass
