## ADDED Requirements

### Requirement: Draw/Select mode toolbar

Feature: Annotation tool mode selection
Rule: The PDF viewer must provide a toolbar allowing the user to switch between Draw mode and Select mode.

#### Scenario: Draw mode is active by default
- **GIVEN** a PDF file is open in the viewer
- **WHEN** the viewer first renders
- **THEN** Draw mode SHALL be active
- **AND** the cursor over the PDF SHALL be a crosshair

#### Scenario: User switches to Select mode
- **GIVEN** the PDF viewer is open in Draw mode
- **WHEN** the user clicks the Select tool in the toolbar
- **THEN** Select mode SHALL become active
- **AND** the active tool SHALL be visually indicated in the toolbar
- **AND** the cursor over the PDF SHALL change to a pointer

#### Scenario: User switches back to Draw mode
- **GIVEN** the PDF viewer is open in Select mode
- **WHEN** the user clicks the Draw tool in the toolbar
- **THEN** Draw mode SHALL become active
- **AND** drawing behaviour SHALL resume as before

#### Scenario: Drawing is disabled in Select mode
- **GIVEN** Select mode is active
- **WHEN** the user clicks and drags on the PDF page
- **THEN** no new rectangle SHALL be drawn

### Requirement: Annotation selection and delete

Feature: Annotation deletion via Select mode
Rule: In Select mode the user must be able to select an existing annotation rectangle and delete it after confirming.

#### Scenario: Clicking a rect in Select mode selects it
- **GIVEN** Select mode is active and at least one annotation exists on the current page
- **WHEN** the user clicks on an existing annotation rectangle
- **THEN** the rectangle SHALL be visually highlighted (distinct stroke colour or weight)
- **AND** a delete button SHALL appear associated with the selected rectangle

#### Scenario: Clicking outside deselects
- **GIVEN** an annotation is selected in Select mode
- **WHEN** the user clicks on an area of the PDF that does not intersect any annotation
- **THEN** the selection SHALL be cleared
- **AND** the delete button SHALL be hidden

#### Scenario: Delete button triggers confirmation dialog
- **GIVEN** an annotation is selected and the delete button is visible
- **WHEN** the user clicks the delete button
- **THEN** a confirmation dialog SHALL appear asking the user to confirm deletion

#### Scenario: Confirming deletion removes the annotation
- **GIVEN** the confirmation dialog is open for annotation id `5`
- **WHEN** the user confirms
- **THEN** a DELETE request SHALL be sent to `/annotations/5`
- **AND** the annotation rectangle SHALL be removed from the SVG overlay
- **AND** the selection state SHALL be cleared

#### Scenario: Cancelling deletion keeps the annotation
- **GIVEN** the confirmation dialog is open
- **WHEN** the user cancels
- **THEN** no DELETE request SHALL be sent
- **AND** the annotation SHALL remain visible and selected

#### Scenario: Switching page clears selection
- **GIVEN** an annotation is selected on page 1
- **WHEN** the user navigates to a different page
- **THEN** the selection SHALL be cleared on the new page

### Requirement: Annotation delete endpoint

Feature: Backend annotation deletion
Rule: The backend must expose an endpoint to delete a single annotation by ID.

#### Scenario: Delete existing annotation
- **GIVEN** an annotation with id `5` exists in the database
- **WHEN** a DELETE request is made to `/annotations/5`
- **THEN** the response SHALL be HTTP 204 No Content
- **AND** the annotation record SHALL be removed from the database

#### Scenario: Delete non-existent annotation
- **GIVEN** no annotation with id `999` exists
- **WHEN** a DELETE request is made to `/annotations/999`
- **THEN** the response SHALL be HTTP 404
