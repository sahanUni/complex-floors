## Why

Three UX gaps reduce confidence in the tool: uploading gives no visual feedback so users don't know if a large PDF is transferring, every file shows "Pending" forever making the status column meaningless, and there is no way to remove a wrongly placed annotation rectangle short of refreshing and losing context.

## What Changes

- Replace `fetch` in `UploadModal` with `XMLHttpRequest` to expose upload progress events; render aggregate progress bar during upload.
- Map `status: "pending"` → label `"Uploaded"` in the frontend file table; no backend change required.
- Add a Draw/Select mode toolbar to the PDF viewer controls bar.
  - **Draw mode** (default): existing crosshair drag-to-draw behaviour unchanged.
  - **Select mode**: clicking an existing annotation rect selects it (highlighted stroke); a delete button appears; confirming calls new `DELETE /annotations/:id` backend endpoint and removes the rect.
- Add `DELETE /annotations/:id` endpoint to the FastAPI backend.

## Capabilities

### New Capabilities

- `upload-progress`: Aggregate XHR upload progress bar shown in `UploadModal` while files are transferring.
- `annotation-deletion`: Select-mode toolbar + per-rect delete action backed by `DELETE /annotations/:id`.

### Modified Capabilities

- `file-upload`: Status label display changes — `pending` maps to `"Uploaded"` in the frontend; no spec-level flow change beyond label rendering.
- `annotation-drawing`: Toolbar added to viewer controls bar introducing Draw/Select modes; existing draw behaviour is unchanged in Draw mode.

## Impact

- `frontend/src/app/UploadModal.tsx` — replace `fetch` with XHR, add progress bar UI.
- `frontend/src/app/ProjectList.tsx` — add `pending → "Uploaded"` status label mapping.
- `frontend/src/app/AnnotationLayer.tsx` — add selection state, highlight selected rect, expose delete callback.
- `frontend/src/app/PdfViewer.tsx` — add Draw/Select toolbar to controls bar, wire mode state down to `AnnotationLayer`.
- `backend/main.py` — add `DELETE /annotations/{annotation_id}` endpoint.
- No new dependencies required.
