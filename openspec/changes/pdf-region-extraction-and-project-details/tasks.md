## 1. Backend — Schema and Dependencies

- [ ] 1.1 Add `pymupdf` to `backend/requirements.txt`
- [ ] 1.2 Add `extractions` table to `init_db()` in `backend/main.py` with columns: `id`, `annotation_id` (FK → annotations), `category`, `label_code`, `label_display`, `note`, `svg_path`, `status`, `extracted_at`, `created_at`
- [ ] 1.3 Create `uploads/{project_id}/extractions/` directory on first extraction (mkdir parents, exist_ok)
- [ ] 1.4 Extend project delete cascade in `DELETE /projects/{project_id}` to also delete `extractions` rows for all file annotations before deleting files

## 2. Backend — Extraction Endpoint

- [ ] 2.1 Add `ExtractionCreate` Pydantic model with fields: `category`, `label_code`, `label_display` (optional), `note` (optional)
- [ ] 2.2 Add `POST /annotations/{annotation_id}/extract` endpoint: look up annotation → look up file (to get project_id and filepath) → open PDF with `fitz.open()` → select page (`doc[page - 1]`) → `clip = fitz.Rect(x0, y0, x1, y1)` → `page.get_svg_image(clip=clip)` → write SVG to `uploads/{project_id}/extractions/{annotation_id}.svg` → insert into `extractions` table with `status='done'` → return 201 with extraction record
- [ ] 2.3 Return HTTP 404 from `POST /annotations/{annotation_id}/extract` if annotation does not exist
- [ ] 2.4 Return HTTP 500 and write no DB record if PyMuPDF raises an exception during extraction
- [ ] 2.5 Add `GET /projects/{project_id}/extractions` endpoint: JOIN `extractions` → `annotations` → `files` filtered by `project_id`; return array with `id`, `annotation_id`, `file_id`, `category`, `label_code`, `label_display`, `note`, `status`, `extracted_at`
- [ ] 2.6 Add `GET /extractions/{extraction_id}` endpoint: look up `svg_path` from `extractions` → stream SVG bytes with `Content-Type: image/svg+xml`; return 404 if record missing or file missing from disk
- [ ] 2.7 Add `DELETE` to CORS `allow_methods` list to cover new endpoints (verify `extractions`-related DELETE is covered by existing project delete method)

## 3. Frontend — Project List Navigation

- [ ] 3.1 In `ProjectList.tsx`, change project item click handler from inline-expand to `router.push('/projects/${project.id}')` using Next.js `useRouter`
- [ ] 3.2 Remove inline file panel state and file-list rendering from `ProjectList.tsx`
- [ ] 3.3 Wrap each project item in a `<Link href="/projects/{id}">` or use `router.push` on click — ensure delete button click does not propagate to navigation

## 4. Frontend — Project Details Page

- [ ] 4.1 Create `frontend/src/app/projects/[id]/page.tsx` as a server component that fetches `GET /projects/{id}/files` and `GET /projects/{id}/extractions` in parallel
- [ ] 4.2 Render project name and description at the top of the details page
- [ ] 4.3 Render document list showing filename, file type, and upload status for each file
- [ ] 4.4 Make each document list item clickable to open the PDF viewer (can reuse or import `PdfViewer` component)
- [ ] 4.5 Render extracted SVG regions grouped under their source file, each showing category, label code, optional display name, and optional note
- [ ] 4.6 Fetch and display each extraction's SVG via `GET /extractions/{id}` using an `<img>` tag or `<object>` with `type="image/svg+xml"`
- [ ] 4.7 Show empty state message when a project has no extractions
- [ ] 4.8 Show not-found message when the project ID does not exist (handle 404 from backend gracefully)
- [ ] 4.9 Add a back link or breadcrumb on the details page navigating to `/`

## 5. Frontend — Label Panel (Annotation Confirm Flow)

- [ ] 5.1 Create `LabelPanel.tsx` client component with: category dropdown (Floor Plan, Elevation View, Cross Section, Specification, Schedule, Other), conditional level code dropdown (B01, L00, L01, L02, L03, L04, L05) shown only when Floor Plan selected, optional display name text input (shown with level code dropdown), optional note textarea, Confirm button, Cancel button
- [ ] 5.2 In `AnnotationLayer.tsx`, after `handleMouseUp` places a pending rect, show `LabelPanel` overlaid near the rect instead of immediately POSTing to `/files/{id}/annotations`
- [ ] 5.3 On Cancel in label panel: clear the pending rect state, close panel, send no request
- [ ] 5.4 On Confirm in label panel: POST to `/files/{fileId}/annotations` to save annotation → on success take returned `annotation_id` → POST to `/annotations/{id}/extract` with label metadata → on extraction success add annotation to overlay state and close panel
- [ ] 5.5 Validate on Confirm: category is required; level code is required when Floor Plan selected — show inline field error, do not send request
- [ ] 5.6 Disable Confirm button while requests are in flight to prevent double-submit
- [ ] 5.7 Position label panel relative to viewport edge when the drawn rect is near the canvas boundary

## 6. Validation

- [ ] 6.1 Run `openspec validate pdf-region-extraction-and-project-details --type change --strict` and confirm no errors

## 7. Playwright Coverage

- [ ] 7.1 Write Playwright test: `"Label panel appears after drawing a box"` — draw rect in Draw mode, assert label panel visible with category dropdown, Confirm and Cancel buttons
- [ ] 7.2 Write Playwright test: `"Floor Plan category shows level code dropdown"` — select Floor Plan in label panel, assert level code dropdown and display name input appear
- [ ] 7.3 Write Playwright test: `"Non-floor-plan category shows free text label input"` — select Elevation View, assert free text label input visible and no level code dropdown
- [ ] 7.4 Write Playwright test: `"Note field available for all categories"` — open label panel for any category, assert note textarea present
- [ ] 7.5 Write Playwright test: `"Cancel discards the drawn box"` — draw rect, open panel, click Cancel, assert rect removed from overlay and panel closed
- [ ] 7.6 Write Playwright test: `"Confirm saves annotation and triggers extraction"` — draw rect, select Floor Plan + L01, confirm, assert panel closes, rect remains, extraction record exists (check via GET /projects/{id}/extractions)
- [ ] 7.7 Write Playwright test: `"Confirm requires category selection"` — open label panel, click Confirm without selecting category, assert error shown and panel remains open
- [ ] 7.8 Write Playwright test: `"Confirm requires level code for Floor Plan"` — select Floor Plan, click Confirm without level code, assert error shown
- [ ] 7.9 Write Playwright test: `"Fetch extractions for a project"` — call GET /projects/1/extractions directly, assert 200 and array shape
- [ ] 7.10 Write Playwright test: `"Fetch extractions for project with none"` — call GET /projects/{id}/extractions for project with no extractions, assert 200 and empty array
- [ ] 7.11 Write Playwright test: `"Stream SVG for existing extraction"` — call GET /extractions/{id}, assert 200 and Content-Type image/svg+xml
- [ ] 7.12 Write Playwright test: `"Stream SVG for non-existent extraction"` — call GET /extractions/999, assert 404
- [ ] 7.13 Write Playwright test: `"Project delete removes extraction records and SVG files"` — confirm extraction, delete project, assert GET /projects/{id}/extractions returns 404
- [ ] 7.14 Write Playwright test: `"Project Details page renders on navigation"` — click a project in list, assert navigation to /projects/{id}, project name visible, document list visible
- [ ] 7.15 Write Playwright test: `"Extracted SVGs displayed grouped by source file"` — navigate to project with extractions, assert SVG images grouped under file names
- [ ] 7.16 Write Playwright test: `"Project with no extractions shows empty state"` — navigate to project with no extractions, assert empty state message visible
- [ ] 7.17 Write Playwright test: `"Non-existent project shows not found state"` — navigate to /projects/999, assert not-found message visible
- [ ] 7.18 Write Playwright test: `"Back navigation returns to project list"` — navigate to project details, click back link, assert on /
- [ ] 7.19 Write Playwright test: `"Clicking a project navigates to its details page"` — click project in list, assert URL changes to /projects/{id}
- [ ] 7.20 Write Playwright test: `"Project list does not expand inline"` — click project in list, assert no inline file panel appears on /
- [ ] 7.21 Write Playwright test: `"Confirmed annotation persists on overlay"` — draw, label, confirm, assert annotation rect still visible on SVG overlay after panel closes
- [ ] 7.22 Run `npm run test:e2e` in `frontend/` and confirm all new and updated Playwright specs pass

## 8. Manual Verification

- [ ] 8.1 Draw a bounding box on a PDF page, verify the label panel appears with correct category options and level code dropdown for Floor Plan
- [ ] 8.2 Select Floor Plan + level L01, add a display name and note, confirm — verify the box remains on the overlay and no error is shown
- [ ] 8.3 Navigate to the Project Details page by clicking a project in the list — verify project name, document list, and extracted SVG regions are displayed
- [ ] 8.4 Verify the extracted SVG renders correctly in the browser for a floor plan region
- [ ] 8.5 Verify that cancelling the label panel removes the drawn rectangle with no network requests sent
- [ ] 8.6 Delete a project that has extractions — verify project disappears from list and re-fetching its details returns not-found
