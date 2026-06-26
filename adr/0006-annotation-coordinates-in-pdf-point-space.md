---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Store Annotation Bounding Box Coordinates in PDF Point Space

## Context and Problem Statement

When a user draws a bounding box on a rendered PDF page, the mouse events produce coordinates in screen pixel space relative to the canvas element. These coordinates must be stored in the database for future server-side extraction. The choice of coordinate space determines whether stored values survive zoom changes, DPI changes, and whether they can be used directly by server-side tools such as PyMuPDF without conversion.

## Decision Drivers

- Stored coordinates must be resolution- and zoom-independent — the same region must produce the same stored values regardless of the zoom level at draw time
- Future extraction uses PyMuPDF `fitz.Rect`, which takes coordinates in PDF point space (origin bottom-left, 1 pt = 1/72 inch)
- Conversion must happen at the frontend at draw time, not at extraction time — server receives canonical coordinates
- The coordinate transform must be deterministic and reversible

## Considered Options

- Store in PDF point space (device-independent, PyMuPDF-compatible)
- Store in screen pixels at a fixed DPI (normalised pixel space)
- Store in screen pixels as drawn (raw mouse coordinates)

## Decision Outcome

Chosen option: "PDF point space", because it is the only representation that is simultaneously zoom-independent, DPI-independent, and directly compatible with PyMuPDF `fitz.Rect` without any server-side conversion. All coordinate translation responsibility sits at the frontend draw layer.

The frontend converts mouse coordinates to PDF points using page dimensions exposed by react-pdf's `onPageLoadSuccess` callback (width and height in PDF points and rendered pixels). The Y-axis is flipped: PDF origin is bottom-left, screen origin is top-left.

**Transform at draw time:**
```
pdf_x = (mouse_x / rendered_width_px)  * page_width_pt
pdf_y = page_height_pt - (mouse_y / rendered_height_px) * page_height_pt
```

### Consequences

- Good, because coordinates are zoom-independent — drawing at 50% and 200% zoom over the same region produces identical stored values
- Good, because PyMuPDF `fitz.Rect(x0, y0, x1, y1)` accepts PDF point coordinates directly — no server-side conversion in the future extraction endpoint
- Good, because stored values survive re-renders, page resizes, and viewport changes
- Bad, because the frontend must implement the coordinate transform and Y-axis flip — a subtle but testable calculation
- Bad, because the Y-axis flip (`pdf_y = page_height - screen_y_fraction * page_height`) is a common bug surface; must be documented and tested in `AnnotationLayer`
- Follow-up: the `AnnotationLayer` component MUST document the transform formula in code; an integration test should verify a known screen region maps to the expected PDF rect

### Confirmation

`annotations` table columns `x0`, `y0`, `x1`, `y1` MUST store values in PDF point units. `x0 < x1` and `y0 < y1` in PDF space (y0 is the lower Y value, closer to bottom of page). No screen-pixel columns are stored. Future endpoints that consume annotations (e.g., PyMuPDF extraction) MUST use stored values as-is for `fitz.Rect`.

## Pros and Cons of the Options

### PDF point space

- Good, because device-independent and zoom-independent
- Good, because directly consumable by PyMuPDF without conversion
- Bad, because frontend coordinate transform adds complexity

### Screen pixels at fixed DPI

- Good, because simpler to store (no transform at draw time)
- Bad, because requires conversion factor at extraction time; stored values change meaning if rendering DPI changes
- Bad, because the "fixed DPI" must be coordinated between frontend and backend — a hidden coupling

### Screen pixels as drawn (raw mouse coordinates)

- Good, because trivially simple to store
- Bad, because values change with every zoom level — the same region produces different stored values at different scales
- Bad, because completely unusable for server-side extraction without knowing the exact zoom and render dimensions at draw time

## More Information

react-pdf exposes page dimensions in both PDF points and rendered pixels via the `onPageLoadSuccess` callback. These two values are sufficient to compute the transform at draw time.

Revisit this decision if: annotations need to be rendered at specific pixel positions for display purposes (inverse transform is straightforward and uses the same ratio). Do not change the stored coordinate space after data has accumulated.
