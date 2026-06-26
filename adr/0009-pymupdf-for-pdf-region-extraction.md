---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Use PyMuPDF (fitz) for Server-Side PDF Region Extraction

## Context and Problem Statement

The backend needs to crop rectangular regions from uploaded PDF files and export them as SVG, using bounding box coordinates stored in PDF point space (ADR-0006). The chosen library must operate on those coordinates directly without conversion, produce vector-preserving SVG output, and be installable as a pure Python dependency.

## Decision Drivers

- Annotation coordinates are stored in PDF point space (origin bottom-left, 1 pt = 1/72 inch) — extraction library must accept this coordinate system natively
- Output must preserve vector content (lines, curves, text) from technical drawings
- Must be a pure Python installable — no OS-level binary dependency
- Must not require a separate process or subprocess call

## Considered Options

- PyMuPDF (`pymupdf` / `fitz`) with `page.get_svg_image(clip=fitz.Rect(x0, y0, x1, y1))`
- `pdf2svg` / `pdfcairo` via subprocess
- `pdfplumber` + manual SVG reconstruction
- `pikepdf` (PDF manipulation only, no rendering)

## Decision Outcome

Chosen option: "PyMuPDF (`pymupdf` / `fitz`)", because it accepts `fitz.Rect` coordinates in PDF point space (matching ADR-0006 exactly), renders vector-preserving SVG via a single method call, installs as a Python wheel with no OS binary dependency, and is actively maintained.

### Consequences

- Good, because `fitz.Rect(x0, y0, x1, y1)` takes PDF-space coordinates directly — no coordinate conversion needed at extraction time.
- Good, because `page.get_svg_image(clip=rect)` produces native SVG preserving vector lines, curves, and embedded text from technical drawings.
- Good, because PyMuPDF ships as a self-contained wheel — `pip install pymupdf` is the only install step.
- Bad, because SVG output quality varies by PDF — complex drawings may produce large or structurally noisy SVG files. Mitigation: reject SVG outputs exceeding a configurable size limit.
- Bad, because PyMuPDF is a large wheel (~30 MB) — acceptable for a local tool, but worth noting for future containerisation.
- Follow-up: if SVG output quality proves insufficient for a specific drawing type, evaluate `cairosvg` + `pdfcairo` subprocess as a fallback per file type.

### Confirmation

Code review: backend extraction endpoint must use `fitz.open(file_path)`, select the page by index (`page = doc[page_number - 1]`), construct `clip = fitz.Rect(x0, y0, x1, y1)`, and call `page.get_svg_image(clip=clip)`. No subprocess call to external binaries.

## Pros and Cons of the Options

### PyMuPDF (`pymupdf` / `fitz`)

- Good, because native PDF-space coordinate system matches ADR-0006 storage format exactly
- Good, because single-method SVG export with clip rect — minimal code path
- Good, because pure Python wheel, no system dependencies
- Good, because actively maintained, widely used for PDF processing in Python
- Bad, because large wheel size (~30 MB)
- Bad, because SVG output can be verbose for complex drawings

### `pdf2svg` / `pdfcairo` via subprocess

- Good, because produces high-quality SVG output for complex drawings
- Bad, because requires OS-level binary (`pdf2svg`, `poppler`) — not installable via pip
- Bad, because requires subprocess coordination — harder error handling and no native clip-rect API

### `pdfplumber` + manual SVG reconstruction

- Good, because pure Python, good for text and table extraction
- Bad, because does not render vector graphics — cannot reconstruct drawing geometry as SVG
- Bad, because manual SVG construction from extracted primitives is error-prone and incomplete

### `pikepdf`

- Good, because pure Python, excellent for PDF structure manipulation
- Bad, because no rendering capability — cannot export a page region as SVG or raster

## More Information

This decision applies to all future server-side PDF region extraction in this codebase. When PNG extraction is introduced (future tiling pipeline), PyMuPDF's `page.get_pixmap(clip=rect, dpi=N)` should be used for consistency — same library, same coordinate system.
