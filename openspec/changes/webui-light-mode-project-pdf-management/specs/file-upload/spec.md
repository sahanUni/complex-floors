## ADDED Requirements

### Requirement: PDF upload endpoint

The backend MUST expose an endpoint to upload one or more PDF files to a project.

#### Scenario: Upload single valid PDF
- **GIVEN** a project with id `1` exists
- **WHEN** a POST request is made to `/projects/1/files` with a multipart form containing one PDF file
- **THEN** the response SHALL be HTTP 201
- **AND** the file SHALL be stored at `uploads/1/{filename}` on disk
- **AND** a file record SHALL be created in the database with `filename`, `filepath`, `file_type`, `status=pending`, and `project_id=1`

#### Scenario: Upload multiple PDFs in one request
- **GIVEN** a project with id `1` exists
- **WHEN** a POST request is made to `/projects/1/files` with a multipart form containing multiple PDF files
- **THEN** the response SHALL be HTTP 201
- **AND** each file SHALL be stored on disk and recorded in the database

#### Scenario: Reject non-PDF file by MIME type
- **GIVEN** a project exists
- **WHEN** a POST request is made with a file whose MIME type is not `application/pdf`
- **THEN** the response SHALL be HTTP 400
- **AND** the file SHALL NOT be written to disk

#### Scenario: Reject non-PDF file by extension
- **GIVEN** a project exists
- **WHEN** a POST request is made with a file whose name does not end in `.pdf`
- **THEN** the response SHALL be HTTP 400
- **AND** the file SHALL NOT be written to disk

#### Scenario: Reject duplicate filename in same project
- **GIVEN** a file named `floor-plan.pdf` already exists for project id `1`
- **WHEN** a POST request is made to `/projects/1/files` with a file also named `floor-plan.pdf`
- **THEN** the response SHALL be HTTP 409 Conflict
- **AND** the existing file SHALL NOT be overwritten

#### Scenario: Upload to non-existent project
- **GIVEN** no project with id `999` exists
- **WHEN** a POST request is made to `/projects/999/files`
- **THEN** the response SHALL be HTTP 404

### Requirement: PDF upload UI

The frontend MUST provide a way to upload one or more PDF files to a project.

#### Scenario: User uploads PDF files to a project
- **GIVEN** a project is selected or in context
- **WHEN** the user selects one or more `.pdf` files and submits the upload form
- **THEN** the uploaded files SHALL appear in the project's file list

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

## MODIFIED Requirements

## REMOVED Requirements
