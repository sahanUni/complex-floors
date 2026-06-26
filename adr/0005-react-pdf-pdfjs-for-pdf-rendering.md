---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Use react-pdf (pdfjs-dist) for In-Browser PDF Rendering

## Context and Problem Statement

The frontend needs to render uploaded PDF files in-browser and support an interactive SVG annotation overlay for drawing bounding boxes on floor plan pages. The chosen library must provide canvas-level access to the rendered page — not just a static viewer — because the annotation overlay must be sized and positioned to match the rendered canvas exactly. The library must also expose the underlying pdfjs-dist API for future text and vector extraction work.

## Decision Drivers

- Must render PDF pages to `<canvas>` to enable precise SVG overlay positioning
- Must expose page dimensions (width, height in PDF points) for coordinate conversion
- Must be open source — no commercial licensing at this stage
- Must work within the Next.js App Router (client component) environment
- Should support pdfjs-dist API access for future PyMuPDF-compatible extraction pipeline

## Considered Options

- react-pdf (pdfjs-dist wrapper)
- `<iframe src="/files/{id}">` or `<embed>` with browser PDF viewer
- @react-pdf-viewer (plugin-based viewer on pdfjs)
- PDFTron WebViewer

## Decision Outcome

Chosen option: "react-pdf (pdfjs-dist wrapper)", because it renders each page to a `<canvas>` element, exposes page dimensions via `onPageLoadSuccess`, and provides direct access to the underlying pdfjs-dist API (text content, operators) needed for the future extraction pipeline. It is OSS, actively maintained, and has the largest React PDF ecosystem.

### Consequences

- Good, because `<canvas>` rendering enables the SVG annotation overlay to be precisely positioned over each page
- Good, because `onPageLoadSuccess` exposes page width/height in PDF points, enabling accurate screen-to-PDF coordinate conversion
- Good, because direct pdfjs-dist API access (`getTextContent`, `getOperatorList`) supports future extraction without additional dependencies
- Bad, because pdfjs-dist requires a Web Worker; Next.js App Router requires explicit `workerSrc` configuration pointing to a copied worker file in `public/`
- Bad, because the dependency adds approximately 1 MB to the client bundle
- Follow-up: copy `pdfjs-dist/build/pdf.worker.min.mjs` to `public/` and set `GlobalWorkerOptions.workerSrc` in a client component at app initialisation

### Confirmation

`frontend/package.json` MUST include `react-pdf`. `pdfjs.GlobalWorkerOptions.workerSrc` MUST be set in a client component before any `<Document>` is rendered. The PDF viewer component MUST use blob URL from `GET /files/{id}` response (per ADR-0003); it MUST NOT pass a static file path or URL to `<Document>`.

## Pros and Cons of the Options

### react-pdf (pdfjs-dist wrapper)

- Good, because canvas rendering and page dimension API are both available
- Good, because OSS with active maintenance
- Bad, because worker setup in Next.js App Router is non-trivial

### `<iframe>` / `<embed>` with browser PDF viewer

- Good, because zero dependencies and no configuration
- Bad, because browser PDF viewer renders inside an iframe — no canvas access, SVG overlay is impossible
- Bad, because page dimensions are not exposed to the host page

### @react-pdf-viewer

- Good, because cleaner plugin-based API
- Neutral, because still pdfjs-dist under the hood
- Bad, because plugin abstraction adds indirection between the host code and raw pdfjs-dist APIs needed for future extraction

### PDFTron WebViewer

- Good, because annotation and bounding box tools are built-in
- Bad, because commercial license required — cost and procurement overhead not justified at this stage
- Bad, because heavy SDK with its own server component

## More Information

Per ADR-0003, `GET /files/{id}` returns `StreamingResponse` with `media_type="application/pdf"`. The frontend fetches this response as `arrayBuffer()`, creates a `Blob`, and passes a blob URL to `react-pdf <Document>`. The pdfjs-dist worker must be configured before the first render.

Revisit this decision if: commercial annotation tools are approved, or if server-side rendering of PDF thumbnails becomes a requirement.
