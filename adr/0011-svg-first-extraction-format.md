---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# SVG as the First Extraction Output Format — PNG and Tiling Deferred

## Context and Problem Statement

When the backend extracts a PDF region, it must choose an output format to store on disk. Two formats are relevant now: SVG (vector, preserves drawing geometry) and PNG (raster, required for LLM vision APIs). PNG for large floor plans requires a tiling strategy to maintain fidelity. The extraction pipeline must ship with one format while leaving the other tractable to add later.

## Decision Drivers

- Floor plan drawings are vector-based — SVG preserves lines, curves, and text without quality loss
- PNG is required for LLM processing (vision APIs accept images, not SVG)
- PNG tiling for large floor plans is a non-trivial sub-problem (tile grid, overlap, stitching metadata) — out of scope for this change
- Browsers render SVG natively — no conversion needed for in-app display on the Project Details page
- ADR-0003 (backend owns file serving) applies to SVG as well as PDF — frontend never holds file paths

## Considered Options

- SVG only (first)
- PNG only (first)
- Both SVG and PNG simultaneously

## Decision Outcome

Chosen option: "SVG only", because it preserves vector fidelity for technical drawings, displays natively in the browser, and defers the tiling complexity of large-format PNG to a dedicated future change. PNG extraction is explicitly planned as a follow-up.

### Consequences

- Good, because SVG preserves vector geometry — lines, curves, and text from technical drawings remain scalable and lossless.
- Good, because browsers render `<img src="...svg">` and `<object>` natively — no client-side conversion needed.
- Good, because PyMuPDF (ADR-0009) produces SVG via a single method call — minimal implementation surface.
- Good, because deferring PNG avoids premature tiling architecture that would need to be revised once LLM requirements are clearer.
- Bad, because LLM vision APIs (GPT-4V, Claude) do not accept SVG — PNG will be required before LLM processing can begin. This is a known, accepted gap.
- Bad, because some PDFs produce large or structurally noisy SVG — size limits must be enforced at extraction time.
- Follow-up: PNG extraction with tiling (tile grid, DPI, overlap metadata) is the next planned extraction format. When implemented, it will add rows to `extractions` (ADR-0010) rather than modify this SVG pipeline.

### Confirmation

Code review: extraction endpoint must store SVG only. No PNG generation code should appear in the extraction service. `extractions.svg_path` column name is format-specific by design — if PNG is added later, a format-agnostic column or separate table may be warranted (see ADR-0010 follow-up).

## Pros and Cons of the Options

### SVG only (first)

- Good, because vector fidelity — lossless for technical drawing content
- Good, because browser-native display
- Good, because single implementation path via PyMuPDF
- Bad, because incompatible with LLM vision APIs — PNG required for that use case

### PNG only (first)

- Good, because directly usable by LLM vision APIs
- Bad, because rasterisation loses vector quality — no path back to vector from PNG
- Bad, because tiling for large floor plans is required for fidelity — significant implementation scope
- Bad, because DPI choice is a premature commitment without knowing LLM API constraints

### Both SVG and PNG simultaneously

- Good, because covers both display and LLM use cases from day one
- Bad, because doubles implementation scope — tiling must be solved immediately
- Bad, because over-engineers the first extraction step before LLM integration requirements are known

## More Information

When the PNG tiling pipeline is designed, revisit whether `extractions.svg_path` should be generalised to `output_path` with a `format` column, or whether a separate `extraction_outputs` child table is preferable. That decision should supersede or extend ADR-0010 rather than this one.
