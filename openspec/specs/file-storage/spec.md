# File Storage

## Purpose

Defines the requirements for file storage in the floor plan analysis system, covering on-disk organisation of uploaded files, database metadata tracking, backend PDF streaming, and environment-based storage configuration.

## Requirements

### Requirement: Per-project file organisation on disk

Uploaded files MUST be stored under `uploads/{project-id}/` relative to the backend process working directory.

#### Scenario: Seed files exist at correct paths
- **GIVEN** the backend has initialised with seed data
- **WHEN** the `uploads/` directory is inspected
- **THEN** each seeded file SHALL exist at `uploads/{project-id}/{filename}`
- **AND** files belonging to different projects SHALL be in separate subdirectories

#### Scenario: File path stored as relative in database
- **GIVEN** a file record exists in the database
- **WHEN** the `filepath` column is read
- **THEN** it SHALL be a relative path in the format `{project-id}/{filename}`
- **AND** it SHALL NOT be an absolute system path

### Requirement: File metadata tracking

The database MUST track metadata for every file associated with a project.

#### Scenario: File record contains required metadata
- **GIVEN** a file has been seeded for a project
- **WHEN** the `files` table is queried
- **THEN** each record SHALL contain `id`, `project_id`, `filename`, `filepath`, `file_type`, `uploaded_at`, and `status`
- **AND** `status` SHALL default to `pending`

#### Scenario: File types reflect drawing category
- **GIVEN** seed data is loaded
- **WHEN** file records are inspected
- **THEN** `file_type` values SHALL be one of: `floor-plan`, `elevation`, `section`, `spec`

### Requirement: PDF file streaming via backend

The backend MUST stream PDF file bytes directly to the client. The frontend MUST NOT resolve file paths directly.

#### Scenario: Stream existing PDF file
- **GIVEN** a file record with id `1` exists and the corresponding file is present on disk
- **WHEN** a GET request is made to `/files/1`
- **THEN** the response SHALL be HTTP 200
- **AND** the `Content-Type` header SHALL be `application/pdf`
- **AND** the response body SHALL be the raw bytes of the PDF file

#### Scenario: Request for non-existent file record
- **GIVEN** no file record with id `999` exists
- **WHEN** a GET request is made to `/files/999`
- **THEN** the response SHALL be HTTP 404

#### Scenario: File record exists but file missing from disk
- **GIVEN** a file record exists but the file has been deleted from disk
- **WHEN** a GET request is made to `/files/{id}`
- **THEN** the response SHALL be HTTP 404

### Requirement: Storage configuration via environment

The file storage root path MUST be configurable via environment variable.

#### Scenario: Backend uses UPLOAD_ROOT from environment
- **GIVEN** `backend/.env` sets `UPLOAD_ROOT=./uploads`
- **WHEN** the backend resolves a file path for streaming
- **THEN** it SHALL join `UPLOAD_ROOT` with the relative `filepath` from the database record
- **AND** SHALL NOT use a hardcoded absolute path
