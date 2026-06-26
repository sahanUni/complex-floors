## ADDED Requirements

### Requirement: Upload progress bar

Feature: Upload progress feedback
Rule: The user must receive visual feedback showing upload progress as a percentage while files are being transferred.

#### Scenario: Progress bar appears on upload start
- **GIVEN** the upload modal is open and the user has selected one or more PDF files
- **WHEN** the user clicks Upload
- **THEN** a progress bar SHALL appear immediately
- **AND** the Upload button SHALL be disabled for the duration of the transfer

#### Scenario: Progress bar updates as bytes are transferred
- **GIVEN** an upload is in progress
- **WHEN** the browser receives upload progress events from the XHR transfer
- **THEN** the progress bar SHALL update to reflect the percentage of bytes transferred (loaded / total × 100)

#### Scenario: Progress bar reaches 100% on completion
- **GIVEN** an upload is in progress
- **WHEN** the server responds with HTTP 201
- **THEN** the progress bar SHALL reach 100%
- **AND** the modal SHALL close and the file list SHALL refresh

#### Scenario: Progress bar hidden on error
- **GIVEN** an upload is in progress
- **WHEN** the server responds with a non-2xx status or a network error occurs
- **THEN** the progress bar SHALL be hidden
- **AND** an error message SHALL be displayed in the modal

#### Scenario: Indeterminate fallback when total size unavailable
- **GIVEN** an upload is in progress
- **WHEN** the XHR progress event reports total = 0
- **THEN** an indeterminate loading indicator SHALL be shown instead of a percentage bar
