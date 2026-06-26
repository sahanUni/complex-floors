## ADDED Requirements

### Requirement: Project Details page

The frontend MUST provide a dedicated page at `/projects/[id]` that displays a project's uploaded documents and all confirmed extracted SVG regions.

#### Scenario: Project Details page renders on navigation
- **GIVEN** a project with id `1` exists with files and extractions
- **WHEN** a user navigates to `/projects/1`
- **THEN** the page SHALL display the project name and description
- **AND** the page SHALL display a list of all uploaded documents for the project, showing filename, file type, and upload status
- **AND** the page SHALL display all extracted SVG regions for the project

#### Scenario: Extracted SVGs displayed grouped by source file
- **GIVEN** project id `1` has two files, each with confirmed extractions
- **WHEN** the user views `/projects/1`
- **THEN** the extractions SHALL be grouped under their source file
- **AND** each extraction SHALL display its category, label code, and optional display name and note
- **AND** each extraction SHALL render the SVG image fetched from `GET /extractions/{id}`

#### Scenario: Project with no extractions shows empty state
- **GIVEN** a project with id `2` exists but has no confirmed extractions
- **WHEN** the user views `/projects/2`
- **THEN** the page SHALL display the document list
- **AND** the page SHALL indicate that no extractions exist yet

#### Scenario: Document in list opens PDF viewer
- **GIVEN** the user is on `/projects/1` and the document list is visible
- **WHEN** the user clicks on a document entry
- **THEN** the PDF viewer SHALL open for that document, allowing annotation and extraction

#### Scenario: Back navigation returns to project list
- **GIVEN** the user is on `/projects/1`
- **WHEN** the user activates the browser back control or a back link on the page
- **THEN** the user SHALL return to the project list at `/`

#### Scenario: Non-existent project shows not found state
- **GIVEN** no project with id `999` exists
- **WHEN** the user navigates to `/projects/999`
- **THEN** the page SHALL display a not-found message
- **AND** SHALL NOT show an unhandled error
