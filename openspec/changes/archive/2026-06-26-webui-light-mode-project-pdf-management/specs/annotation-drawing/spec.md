## ADDED Requirements

### Requirement: Bounding box drawing on PDF page

The frontend MUST allow the user to draw rectangular bounding boxes on a PDF page via an SVG overlay positioned above the rendered canvas.

#### Scenario: User draws a bounding box
- **GIVEN** a PDF page is displayed in the viewer
- **WHEN** the user clicks and drags on the PDF page
- **THEN** a rectangle SHALL be drawn showing the selected region in real time
- **AND** on mouse release the rectangle SHALL remain visible as a placed annotation

#### Scenario: Multiple boxes on same page
- **GIVEN** a PDF page is displayed with one existing annotation
- **WHEN** the user draws another bounding box on the same page
- **THEN** both boxes SHALL be visible simultaneously

#### Scenario: Boxes persist across page navigation
- **GIVEN** annotations exist on page 1 and the user navigates to page 2
- **WHEN** the user navigates back to page 1
- **THEN** the annotations on page 1 SHALL still be visible

#### Scenario: SVG overlay matches canvas dimensions
- **GIVEN** the PDF page is rendered at any zoom level
- **WHEN** the annotation overlay is displayed
- **THEN** the SVG layer SHALL be positioned and sized to exactly cover the rendered page canvas

### Requirement: Annotation coordinate storage in PDF space

Bounding box coordinates MUST be stored in PDF point units (origin bottom-left, per PDF spec), not screen pixels. This ensures coordinates are zoom-independent and usable directly by server-side extraction tools.

#### Scenario: Coordinates stored in PDF units
- **GIVEN** a user draws a bounding box on a PDF page rendered at 150% zoom
- **WHEN** the annotation is saved
- **THEN** the stored `x0`, `y0`, `x1`, `y1` values SHALL represent PDF-space points
- **AND** the same values SHALL be produced if the box is drawn over the same region at 100% zoom

#### Scenario: Y-axis correctly converted from screen to PDF space
- **GIVEN** a user draws a box in the upper portion of a PDF page (screen-space low Y)
- **WHEN** the annotation is saved
- **THEN** the stored `y0` and `y1` SHALL reflect the PDF coordinate system where Y=0 is at the bottom of the page

### Requirement: Annotation persistence endpoint

The backend MUST expose endpoints to save and retrieve bounding box annotations per file per page.

#### Scenario: Save annotation for a file page
- **GIVEN** a file with id `3` exists
- **WHEN** a POST request is made to `/files/3/annotations` with `page`, `x0`, `y0`, `x1`, `y1` in PDF units
- **THEN** the response SHALL be HTTP 201
- **AND** the annotation SHALL be recorded in the `annotations` table linked to `file_id=3`

#### Scenario: Retrieve annotations for a file
- **GIVEN** two annotations exist for file id `3` on page 1
- **WHEN** a GET request is made to `/files/3/annotations`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be a JSON array containing both annotation records with `id`, `file_id`, `page`, `x0`, `y0`, `x1`, `y1`, and `created_at`

#### Scenario: Retrieve annotations for file with none saved
- **GIVEN** a file with id `7` exists and has no annotations
- **WHEN** a GET request is made to `/files/7/annotations`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be an empty JSON array

#### Scenario: Save annotation for non-existent file
- **GIVEN** no file with id `999` exists
- **WHEN** a POST request is made to `/files/999/annotations`
- **THEN** the response SHALL be HTTP 404

### Requirement: Annotations loaded on file open

When the user opens a PDF file in the viewer, any previously saved annotations for that file MUST be loaded and displayed.

#### Scenario: Existing annotations visible on viewer open
- **GIVEN** file id `3` has two saved annotations on page 1
- **WHEN** the user opens file id `3` in the PDF viewer
- **THEN** both annotation boxes SHALL be rendered on page 1 of the viewer

#### Scenario: No annotations shows blank overlay
- **GIVEN** file id `7` has no saved annotations
- **WHEN** the user opens file id `7` in the PDF viewer
- **THEN** the overlay SHALL be blank and ready for new box drawing

## MODIFIED Requirements

## REMOVED Requirements
