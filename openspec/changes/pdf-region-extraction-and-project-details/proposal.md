## Why

Users draw bounding boxes on PDF pages but currently have no way to classify, label, or extract those regions. Extracted, labelled regions (especially floor plans keyed by level code) are the primary input for all future processing steps — measurement, LLM analysis, BOQ generation. This change introduces the full draw-label-confirm-extract pipeline and a Project Details page to surface the results.

## What Changes

- **New confirm flow** after drawing a bounding box: user selects category, assigns a label (level code + optional display name for floor plans; free text for others), adds an optional note, then confirms — triggering backend SVG extraction.
- **SVG extraction backend**: PyMuPDF crops the PDF-space region from the annotation and saves an SVG file to disk. PNG/tiling deferred to a future change.
- **New `extractions` table** in SQLite linked to `annotation_id`, storing category, label codes, note, svg path, and extraction status.
- **New `/projects/[id]` route** (Project Details page): clicking a project on the list navigates here. Shows all uploaded documents and all extracted SVGs grouped by file.
- **Project list** items change from inline file expansion to navigation links to `/projects/[id]`.
- Floor plan levels use a fixed code system: `B01, L00, L01, L02, L03, L04, L05` with an optional display name alongside each code.

## Capabilities

### New Capabilities

- `pdf-region-extraction`: Confirm-and-extract pipeline — annotation labelling UI (category enum, level code dropdown for floor plans, optional display name + note), backend extraction endpoint using PyMuPDF, `extractions` table, SVG file storage under `uploads/{project_id}/extractions/`.
- `project-details-page`: New `/projects/[id]` Next.js route displaying project documents (PDF files) and extracted SVG regions grouped by file, with extraction metadata (category, label, note).

### Modified Capabilities

- `project-management`: Project list items navigate to `/projects/[id]` instead of expanding inline. Inline file panel removed from main page.
- `annotation-drawing`: Draw interaction gains a post-draw confirm step (labelling UI + confirm/cancel). Unconfirmed boxes remain visible but are not extracted. Confirming triggers extraction.

## Impact

- **Backend**: Add `PyMuPDF` (`pymupdf`) dependency. New `extractions` table. New endpoints: `POST /annotations/{id}/extract`, `GET /projects/{id}/extractions`. SVG files stored at `uploads/{project_id}/extractions/{annotation_id}.svg`. New streaming endpoint for SVG: `GET /extractions/{id}`.
- **Frontend**: New `/projects/[id]` page (Next.js App Router dynamic route). `AnnotationLayer` gains post-draw labelling panel. `ProjectList` items become navigation links.
- **Database**: Schema migration adds `extractions` table; existing `annotations` data unaffected.
- **Dependencies**: `pymupdf` added to `backend/requirements.txt`.
