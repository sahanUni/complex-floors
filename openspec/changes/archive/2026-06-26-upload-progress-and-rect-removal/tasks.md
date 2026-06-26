## 1. Backend — Annotation Delete Endpoint

- [x] 1.1 Add `DELETE /annotations/{annotation_id}` endpoint to `backend/main.py` that deletes the row by id and returns 204, or 404 if not found
- [x] 1.2 Add `DELETE` to the CORS `allow_methods` list in `backend/main.py` (currently only GET, POST, DELETE — verify it is included)
- [x] 1.3 Manually test endpoint with curl: verify 204 on valid id, 404 on missing id

## 2. Frontend — Upload Progress Bar

- [x] 2.1 Replace `fetch` with `XMLHttpRequest` in `frontend/src/app/UploadModal.tsx` for the multipart POST to `/projects/{id}/files`
- [x] 2.2 Attach `xhr.upload.addEventListener('progress', handler)` to update a `progress` state variable (0–100)
- [x] 2.3 Render a `<progress>` element (or styled `<div>`) below the file input showing percentage; hide it when not uploading
- [x] 2.4 Fall back to indeterminate indicator when `event.total === 0`
- [x] 2.5 Disable Upload and Cancel buttons while uploading (already done for Cancel; verify both are disabled)
- [x] 2.6 On XHR `onload`: check status, call `onUploaded`/`onClose` on 201, set error on 400/409/other
- [x] 2.7 On XHR `onerror`: set network error message, reset uploading state

## 3. Frontend — File Status Label

- [x] 3.1 Add status label map `{ pending: 'Uploaded' }` in `frontend/src/app/ProjectList.tsx` (mirror pattern of `FILE_TYPE_LABELS`)
- [x] 3.2 Apply the map when rendering the Status cell: `STATUS_LABELS[f.status] ?? f.status`

## 4. Frontend — Draw/Select Toolbar in PdfViewer

- [x] 4.1 Add `mode` state (`'draw' | 'select'`) to `frontend/src/app/PdfViewer.tsx`, defaulting to `'draw'`
- [x] 4.2 Render Draw and Select toolbar buttons in the viewer controls bar, with active state styling on the current mode
- [x] 4.3 Pass `mode` prop down to `AnnotationLayer`

## 5. Frontend — Annotation Selection and Delete in AnnotationLayer

- [x] 5.1 Accept `mode: 'draw' | 'select'` prop in `frontend/src/app/AnnotationLayer.tsx`
- [x] 5.2 In Select mode, disable `onMouseDown` draw initiation (no new rect drawn on drag)
- [x] 5.3 Add `selectedId` state; on click in Select mode, hit-test existing annotations and set `selectedId` to the clicked annotation's id (or `null` if none hit)
- [x] 5.4 Highlight the selected rect with a distinct stroke colour/weight (e.g. red stroke, strokeWidth 2.5)
- [x] 5.5 Render a delete button (`×`) positioned near the top-right corner of the selected rect
- [x] 5.6 On delete button click: show `confirm('Delete this annotation?')` dialog
- [x] 5.7 On confirm: call `DELETE /annotations/{id}`, remove annotation from local state, clear `selectedId`
- [x] 5.8 On cancel: no-op, annotation remains selected
- [x] 5.9 Reset `selectedId` to `null` when `page` prop changes (selection clears on page navigation)
- [x] 5.10 In Draw mode, set SVG cursor to `crosshair`; in Select mode, set cursor to `pointer`

## 6. OpenSpec Validation

- [x] 6.1 Run `openspec validate upload-progress-and-rect-removal --type change --strict` and confirm no errors

## 7. Playwright Coverage

- [x] 7.1 Write test "Progress bar appears on upload start" — mock slow upload, assert `<progress>` element visible immediately after clicking Upload
- [x] 7.2 Write test "Progress bar updates as bytes are transferred" — assert progress value increases during transfer
- [x] 7.3 Write test "Progress bar reaches 100% on completion" — assert modal closes and file appears in list after 201
- [x] 7.4 Write test "Progress bar hidden on error" — mock 500 response, assert progress hidden and error message shown
- [x] 7.5 Write test "File status label maps pending to Uploaded" — upload file, assert Status cell shows "Uploaded" not "pending"
- [x] 7.6 Write test "Draw mode is active by default" — open PDF viewer, assert Draw tool button is active
- [x] 7.7 Write test "User switches to Select mode" — click Select tool, assert it becomes active, cursor changes
- [x] 7.8 Write test "User switches back to Draw mode" — click Select then Draw, assert Draw is active
- [x] 7.9 Write test "Drawing is disabled in Select mode" — activate Select mode, drag on PDF, assert no new rect appears
- [x] 7.10 Write test "Clicking a rect in Select mode selects it" — draw a rect, switch to Select, click rect, assert highlight and delete button visible
- [x] 7.11 Write test "Clicking outside deselects" — select a rect, click empty area, assert delete button hidden
- [x] 7.12 Write test "Delete button triggers confirmation dialog" — select rect, click ×, assert confirm dialog appears
- [x] 7.13 Write test "Confirming deletion removes the annotation" — confirm dialog, assert rect gone from SVG and DELETE request sent
- [x] 7.14 Write test "Cancelling deletion keeps the annotation" — dismiss dialog, assert rect still visible
- [x] 7.15 Write test "Switching page clears selection" — select rect on page 1, navigate to page 2, navigate back, assert nothing selected
- [x] 7.16 Run `npm run test:e2e` in `frontend/` and confirm all new tests pass

## 8. Manual Verification

- [x] 8.1 User uploads a multi-MB PDF and confirms the progress bar appears and increases to 100% before the modal closes
- [x] 8.2 User confirms all existing files in a project show "Uploaded" in the Status column (not "pending")
- [x] 8.3 User opens a PDF, confirms Draw tool is active by default, draws a bounding box successfully
- [x] 8.4 User switches to Select mode, clicks an existing annotation, confirms it highlights and a delete (×) button appears
- [x] 8.5 User clicks × and cancels the confirmation dialog — confirms annotation is still visible
- [x] 8.6 User clicks × and confirms deletion — confirms annotation disappears from the PDF overlay
- [x] 8.7 User confirms that in Select mode, clicking and dragging on the PDF does not draw a new rectangle
