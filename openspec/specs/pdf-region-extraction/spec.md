# PDF Region Extraction

## Purpose

Defines the requirements for extracting PDF regions as SVG after a user draws and confirms a labelled bounding box annotation, including the label panel interaction, backend extraction endpoints, retrieval endpoints, and cascade deletion behaviour.

## Requirements

### Requirement: Post-draw label panel

After a user draws a bounding box, a label panel MUST appear allowing the user to classify the region before confirming extraction.

#### Scenario: Label panel appears after drawing a box
- **GIVEN** Draw mode is active and a PDF page is displayed
- **WHEN** the user draws a bounding box and releases the mouse
- **THEN** a label panel SHALL appear associated with the drawn rectangle
- **AND** the panel SHALL contain a category dropdown with options: Floor Plan, Elevation View, Cross Section, Specification, Schedule, Other
- **AND** the panel SHALL contain a Confirm button and a Cancel button

#### Scenario: Floor Plan category shows level code dropdown
- **GIVEN** the label panel is open and the user selects "Floor Plan" from the category dropdown
- **WHEN** the category changes to Floor Plan
- **THEN** a level code dropdown SHALL appear with options: B01, L00, L01, L02, L03, L04, L05
- **AND** an optional display name text input SHALL appear alongside the level code

#### Scenario: Non-floor-plan category shows free text label input
- **GIVEN** the label panel is open and the user selects a category other than Floor Plan
- **WHEN** the category changes
- **THEN** a free text label input SHALL appear for the user to describe the region
- **AND** no level code dropdown SHALL be shown
- **AND** the label input SHALL be required before Confirm can proceed

#### Scenario: Note field available for all categories
- **GIVEN** the label panel is open for any category
- **WHEN** the panel renders
- **THEN** an optional note textarea SHALL be visible

#### Scenario: Cancel discards the drawn box
- **GIVEN** the label panel is open with a drawn box
- **WHEN** the user clicks Cancel
- **THEN** the drawn rectangle SHALL be removed from the overlay
- **AND** no annotation or extraction record SHALL be created
- **AND** the label panel SHALL close

### Requirement: Extraction triggered on confirm

When the user confirms a labelled annotation, the backend MUST extract the PDF region as SVG and persist the result.

#### Scenario: Confirm saves annotation and triggers extraction
- **GIVEN** the label panel is open with a drawn box, a category selected, and required label fields filled
- **WHEN** the user clicks Confirm
- **THEN** the annotation SHALL be saved with its page coordinates
- **AND** a POST request SHALL be sent to `/annotations/{id}/extract` with category, label_code, label_display, and note
- **AND** the backend SHALL extract the PDF region as SVG using the annotation's PDF-space coordinates
- **AND** the extraction record SHALL be saved with status `done`
- **AND** the label panel SHALL close
- **AND** the drawn box SHALL remain visible on the overlay

#### Scenario: Confirm requires category selection
- **GIVEN** the label panel is open and no category has been selected
- **WHEN** the user clicks Confirm
- **THEN** the panel SHALL indicate that a category is required
- **AND** no request SHALL be sent

#### Scenario: Confirm requires level code for Floor Plan
- **GIVEN** the label panel is open with Floor Plan selected and no level code chosen
- **WHEN** the user clicks Confirm
- **THEN** the panel SHALL indicate that a level code is required
- **AND** no request SHALL be sent

#### Scenario: Backend extracts SVG from PDF-space rectangle
- **GIVEN** an annotation with id `5` exists for file id `3` on page 2, with coordinates `x0=72, y0=144, x1=504, y1=648` in PDF points
- **WHEN** a POST request is made to `/annotations/5/extract` with `category="floor-plan"` and `label_code="L01"`
- **THEN** the response SHALL be HTTP 201
- **AND** the response body SHALL contain an extraction record with `id`, `annotation_id`, `category`, `label_code`, `label_display`, `note`, `status`, and `extracted_at`
- **AND** an SVG file SHALL exist at `uploads/{project_id}/extractions/5.svg`
- **AND** `status` SHALL be `done`

#### Scenario: Extraction endpoint for non-existent annotation
- **GIVEN** no annotation with id `999` exists
- **WHEN** a POST request is made to `/annotations/999/extract`
- **THEN** the response SHALL be HTTP 404

#### Scenario: Extraction failure recorded as failed status
- **GIVEN** the PDF file on disk is corrupt or unreadable
- **WHEN** a POST request is made to `/annotations/{id}/extract`
- **THEN** the response SHALL be HTTP 500
- **AND** no extraction record SHALL be written to the database

### Requirement: Extraction retrieval endpoint

The backend MUST expose an endpoint to retrieve all extractions for a project and to stream an individual SVG file.

#### Scenario: Fetch extractions for a project
- **GIVEN** a project with id `1` has two confirmed extractions across its files
- **WHEN** a GET request is made to `/projects/1/extractions`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be a JSON array where each object contains `id`, `annotation_id`, `file_id`, `category`, `label_code`, `label_display`, `note`, `status`, and `extracted_at`

#### Scenario: Fetch extractions for project with none
- **GIVEN** a project with id `2` exists and has no extractions
- **WHEN** a GET request is made to `/projects/2/extractions`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be an empty JSON array

#### Scenario: Stream SVG for existing extraction
- **GIVEN** an extraction with id `3` exists and its SVG file is on disk
- **WHEN** a GET request is made to `/extractions/3`
- **THEN** the response SHALL be HTTP 200
- **AND** the `Content-Type` header SHALL be `image/svg+xml`
- **AND** the response body SHALL be the raw SVG bytes

#### Scenario: Stream SVG for non-existent extraction
- **GIVEN** no extraction with id `999` exists
- **WHEN** a GET request is made to `/extractions/999`
- **THEN** the response SHALL be HTTP 404

### Requirement: Extraction cascade on project delete

When a project is deleted, all extractions and their SVG files MUST be removed as part of the existing cascade.

#### Scenario: Project delete removes extraction records and SVG files
- **GIVEN** a project with id `1` has files, annotations, and extractions with SVG files on disk
- **WHEN** a DELETE request is made to `/projects/1`
- **THEN** the response SHALL be HTTP 200
- **AND** all extraction records for the project SHALL be removed from the database
- **AND** the `uploads/1/` directory (including `uploads/1/extractions/`) SHALL be removed from disk
