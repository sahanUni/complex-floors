## MODIFIED Requirements

### Requirement: Bounding box drawing on PDF page

The frontend MUST allow the user to draw rectangular bounding boxes on a PDF page via an SVG overlay positioned above the rendered canvas. Drawing is only active when Draw mode is selected in the viewer toolbar. After drawing, a label panel MUST appear for classification before the annotation is confirmed and saved.

#### Scenario: User draws a bounding box
- **GIVEN** a PDF page is displayed in the viewer
- **AND** Draw mode is active in the toolbar
- **WHEN** the user clicks and drags on the PDF page
- **THEN** a rectangle SHALL be drawn showing the selected region in real time
- **AND** on mouse release the rectangle SHALL remain visible as a pending annotation
- **AND** the label panel SHALL appear for the user to classify the region

#### Scenario: Confirmed annotation persists on overlay
- **GIVEN** a user has drawn a box and confirmed it with a category and label
- **WHEN** the confirmation is complete
- **THEN** the annotation box SHALL remain visible on the SVG overlay
- **AND** the label panel SHALL close

#### Scenario: Multiple boxes on same page
- **GIVEN** a PDF page is displayed with one existing confirmed annotation
- **AND** Draw mode is active
- **WHEN** the user draws and confirms another bounding box on the same page
- **THEN** both boxes SHALL be visible simultaneously

#### Scenario: Boxes persist across page navigation
- **GIVEN** confirmed annotations exist on page 1 and the user navigates to page 2
- **WHEN** the user navigates back to page 1
- **THEN** the confirmed annotations on page 1 SHALL still be visible

#### Scenario: SVG overlay matches canvas dimensions
- **GIVEN** the PDF page is rendered at any zoom level
- **WHEN** the annotation overlay is displayed
- **THEN** the SVG layer SHALL be positioned and sized to exactly cover the rendered page canvas

#### Scenario: Drawing disabled in Select mode
- **GIVEN** Select mode is active in the toolbar
- **WHEN** the user clicks and drags on the PDF page
- **THEN** no new rectangle SHALL be drawn
