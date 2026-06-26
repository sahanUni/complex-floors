# PDF Viewer

## Purpose

Defines the requirements for in-browser PDF rendering and navigation, covering how PDF files are fetched and displayed using react-pdf (pdfjs-dist).

## Requirements

### Requirement: In-browser PDF rendering

The frontend MUST render PDF files in-browser using `react-pdf` (pdfjs-dist). PDF bytes MUST be fetched from the backend stream endpoint and converted to a blob URL client-side; the frontend MUST NOT construct static file paths or URLs (per ADR-0003).

#### Scenario: User opens a PDF file for viewing
- **GIVEN** a project is selected and its file list is visible
- **WHEN** the user clicks on a PDF file entry
- **THEN** the PDF viewer SHALL open and display the first page of the PDF

#### Scenario: PDF fetched via backend stream endpoint
- **GIVEN** a file with id `5` is opened in the viewer
- **WHEN** the viewer fetches the PDF
- **THEN** it SHALL request `GET /files/5` from the backend
- **AND** the response bytes SHALL be used to create a blob URL for the renderer
- **AND** no static file path or `filepath` field SHALL be used

#### Scenario: PDF with multiple pages shows page count
- **GIVEN** a PDF with 4 pages is opened in the viewer
- **WHEN** the first page is displayed
- **THEN** the viewer SHALL indicate total page count (e.g. "Page 1 of 4")

### Requirement: Page navigation

The viewer MUST allow the user to navigate between pages of a multi-page PDF.

#### Scenario: Navigate to next page
- **GIVEN** a multi-page PDF is open and page 1 is displayed
- **WHEN** the user activates the next-page control
- **THEN** page 2 SHALL be displayed

#### Scenario: Navigate to previous page
- **GIVEN** a multi-page PDF is open and page 2 is displayed
- **WHEN** the user activates the previous-page control
- **THEN** page 1 SHALL be displayed

#### Scenario: Previous control disabled on first page
- **GIVEN** a PDF is open and page 1 is displayed
- **WHEN** the viewer renders
- **THEN** the previous-page control SHALL be disabled or non-interactive

#### Scenario: Next control disabled on last page
- **GIVEN** a PDF is open and the last page is displayed
- **WHEN** the viewer renders
- **THEN** the next-page control SHALL be disabled or non-interactive

### Requirement: Zoom controls

The viewer MUST allow the user to zoom in and out on the current PDF page.

#### Scenario: Zoom in increases rendered page size
- **GIVEN** a PDF page is displayed at default zoom
- **WHEN** the user activates the zoom-in control
- **THEN** the rendered page SHALL appear larger

#### Scenario: Zoom out decreases rendered page size
- **GIVEN** a PDF page is displayed at a zoomed-in level
- **WHEN** the user activates the zoom-out control
- **THEN** the rendered page SHALL appear smaller
