# Project Management

## Purpose

Defines the requirements for project management in the floor plan analysis system, covering the backend endpoints that expose project and file data from the SQLite database, the frontend workspace display, and environment-based configuration.

## Requirements

### Requirement: Project list endpoint

The backend MUST expose a project list endpoint that returns all projects from the SQLite database.

#### Scenario: Fetch all projects
- **GIVEN** the FastAPI backend is running and the SQLite database is initialised with seed data
- **WHEN** a GET request is made to `/projects`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be a JSON array where each object contains `id`, `name`, `description`, and `created_at` fields

#### Scenario: Empty project list
- **GIVEN** the SQLite database contains no projects
- **WHEN** a GET request is made to `/projects`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be an empty JSON array

#### Scenario: CORS allows frontend origin
- **GIVEN** the FastAPI backend is running
- **WHEN** a GET request is made from the configured frontend origin
- **THEN** the response SHALL include the correct `Access-Control-Allow-Origin` header

### Requirement: Project detail with files endpoint

The backend MUST expose an endpoint to retrieve metadata for all files belonging to a specific project.

#### Scenario: Fetch files for existing project
- **GIVEN** a project with id `1` exists and has associated file records
- **WHEN** a GET request is made to `/projects/1/files`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be a JSON array where each object contains `id`, `filename`, `file_type`, `uploaded_at`, and `status` fields
- **AND** `filepath` SHALL NOT be exposed in the response (internal storage detail)

#### Scenario: Fetch files for non-existent project
- **GIVEN** no project with id `999` exists
- **WHEN** a GET request is made to `/projects/999/files`
- **THEN** the response SHALL be HTTP 404

### Requirement: Project workspace display

The frontend MUST display the list of projects fetched from the backend and provide controls to create and delete projects.

#### Scenario: Project list renders on page load
- **GIVEN** the backend is running and returns at least one project
- **WHEN** a user navigates to the Next.js app root (`/`)
- **THEN** the page SHALL display each project's name and description
- **AND** the page SHALL display a control to create a new project
- **AND** each project SHALL display a control to delete it

#### Scenario: Selecting a project shows its files
- **GIVEN** the page displays a list of projects
- **WHEN** a user selects a project
- **THEN** the page SHALL display the files associated with that project, including filename, file type, and status

### Requirement: Configuration via environment variables

Backend port and frontend API URL MUST be driven by environment variables, not hardcoded values.

#### Scenario: Backend reads port from environment
- **GIVEN** `backend/.env` sets `PORT=8010`
- **WHEN** the backend starts
- **THEN** it SHALL listen on port 8010

#### Scenario: Frontend reads API URL from environment
- **GIVEN** `frontend/.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:8010`
- **WHEN** the frontend makes API requests
- **THEN** all requests SHALL target `http://localhost:8010`

### Requirement: Project creation endpoint

The backend MUST expose an endpoint to create a new project.

#### Scenario: Create project with valid data
- **GIVEN** the backend is running
- **WHEN** a POST request is made to `/projects` with a JSON body containing `name` and `description`
- **THEN** the response SHALL be HTTP 201
- **AND** the response body SHALL contain the new project's `id`, `name`, `description`, and `created_at`

#### Scenario: Create project with missing name
- **GIVEN** the backend is running
- **WHEN** a POST request is made to `/projects` with a JSON body missing the `name` field
- **THEN** the response SHALL be HTTP 422

#### Scenario: CORS allows POST from frontend origin
- **GIVEN** the FastAPI backend is running
- **WHEN** a POST request is made from the configured frontend origin
- **THEN** the response SHALL include the correct `Access-Control-Allow-Origin` header

### Requirement: Project deletion with cascade

The backend MUST expose an endpoint to delete a project and all its associated data.

#### Scenario: Delete existing project cascades all data
- **GIVEN** a project with id `1` exists, has associated file records, and those files have associated annotation records
- **WHEN** a DELETE request is made to `/projects/1`
- **THEN** the response SHALL be HTTP 200
- **AND** the project record SHALL no longer exist in the database
- **AND** all file records for that project SHALL be removed from the database
- **AND** all annotation records for those files SHALL be removed from the database
- **AND** the `uploads/1/` directory SHALL be removed from disk

#### Scenario: Delete non-existent project
- **GIVEN** no project with id `999` exists
- **WHEN** a DELETE request is made to `/projects/999`
- **THEN** the response SHALL be HTTP 404

#### Scenario: CORS allows DELETE from frontend origin
- **GIVEN** the FastAPI backend is running
- **WHEN** a DELETE request is made from the configured frontend origin
- **THEN** the response SHALL include the correct `Access-Control-Allow-Origin` header

### Requirement: Project creation UI

The frontend MUST provide a form for creating a new project.

#### Scenario: User creates a project
- **GIVEN** the user is on the project list page
- **WHEN** the user fills in a project name and description and submits the create form
- **THEN** the new project SHALL appear in the project list without a full page reload

#### Scenario: Create form requires name
- **GIVEN** the user is on the project list page
- **WHEN** the user submits the create form with an empty name field
- **THEN** the form SHALL prevent submission and indicate the name is required

### Requirement: Project deletion UI

The frontend MUST provide a way to delete a project.

#### Scenario: User deletes a project
- **GIVEN** the project list displays at least one project
- **WHEN** the user activates the delete action for a project and confirms
- **THEN** the project SHALL be removed from the list without a full page reload
