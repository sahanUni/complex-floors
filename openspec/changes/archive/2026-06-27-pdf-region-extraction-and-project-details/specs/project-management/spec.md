## MODIFIED Requirements

### Requirement: Project workspace display

The frontend MUST display the list of projects fetched from the backend and provide controls to create and delete projects. Clicking a project MUST navigate to the Project Details page.

#### Scenario: Project list renders on page load
- **GIVEN** the backend is running and returns at least one project
- **WHEN** a user navigates to the Next.js app root (`/`)
- **THEN** the page SHALL display each project's name and description
- **AND** the page SHALL display a control to create a new project
- **AND** each project SHALL display a control to delete it

#### Scenario: Clicking a project navigates to its details page
- **GIVEN** the page displays a list of projects
- **WHEN** a user clicks on a project entry
- **THEN** the browser SHALL navigate to `/projects/{id}` for that project
- **AND** the project's files and extractions SHALL be shown on the details page

#### Scenario: Project list does not expand inline
- **GIVEN** the page displays a list of projects
- **WHEN** a user clicks on a project entry
- **THEN** no inline file panel SHALL expand on the project list page
