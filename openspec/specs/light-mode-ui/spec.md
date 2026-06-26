# Light Mode UI

## Purpose

Defines the requirements for the WebUI visual theme, mandating a permanent light theme regardless of the operating system's colour scheme preference.

## Requirements

### Requirement: Always-light theme

The WebUI MUST render with a light theme at all times. Dark-mode overrides from `@media (prefers-color-scheme: dark)` MUST be removed. No user toggle or adaptive behaviour is provided.

#### Scenario: Light theme on dark-OS system
- **GIVEN** a user's operating system is set to dark colour scheme
- **WHEN** the user opens the WebUI in a browser
- **THEN** the page SHALL render with a white/light background
- **AND** text SHALL be dark-coloured
- **AND** no dark background or light text SHALL appear on any element

#### Scenario: Light theme on light-OS system
- **GIVEN** a user's operating system is set to light colour scheme
- **WHEN** the user opens the WebUI in a browser
- **THEN** the page SHALL render with the same white/light theme as on a dark-OS system

#### Scenario: No dark media query override
- **GIVEN** the CSS is inspected
- **WHEN** `@media (prefers-color-scheme: dark)` blocks are searched for
- **THEN** no such blocks SHALL exist in `globals.css` or `page.module.css`
