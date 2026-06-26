## MODIFIED Requirements

### Requirement: PDF upload UI

The frontend MUST provide a way to upload one or more PDF files to a project.

#### Scenario: User uploads PDF files to a project
- **GIVEN** a project is selected or in context
- **WHEN** the user selects one or more `.pdf` files and submits the upload form
- **THEN** the uploaded files SHALL appear in the project's file list
- **AND** each file's status SHALL be displayed as `"Uploaded"` in the file table

#### Scenario: Frontend restricts file picker to PDFs
- **GIVEN** the file upload input is visible
- **WHEN** the user opens the file picker
- **THEN** the file picker SHALL filter to show only PDF files by default

#### Scenario: Frontend rejects non-PDF selection
- **GIVEN** the file upload input is visible
- **WHEN** the user selects a non-PDF file
- **THEN** the frontend SHALL display an error and not submit the file

#### Scenario: Duplicate filename shown as error
- **GIVEN** a file named `floor-plan.pdf` already exists for the project
- **WHEN** the user uploads a file with the same name
- **THEN** the frontend SHALL display a conflict error to the user

#### Scenario: File status label maps pending to Uploaded
- **GIVEN** the backend returns a file record with `status: "pending"`
- **WHEN** the file table renders
- **THEN** the status column SHALL display `"Uploaded"` not `"pending"`
