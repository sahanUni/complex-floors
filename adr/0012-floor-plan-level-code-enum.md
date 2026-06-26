---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Fixed Floor Plan Level Code Enum (B01–L05) as Canonical Internal Key

## Context and Problem Statement

When a user classifies a PDF region as a floor plan, the system must record which building level the extraction represents. Level identifiers will be used as canonical keys in future processing steps (BOQ generation, measurement, cross-file linking). The key must be machine-readable, stable, and consistent across projects, while still allowing a human-readable display name.

## Decision Drivers

- Level code is the canonical join key for future processing — must be stable, unambiguous, and machine-readable
- Building levels span basements, ground, and upper floors — the coding scheme must cover typical commercial and residential developments
- Display names vary by project (e.g. "Ground Floor", "Lobby Level", "Podium") — the system must not conflate display name with the canonical key
- The UI must constrain input to prevent free-form key entry that would break downstream joins
- The initial scope covers floors relevant to the current project types in seed data — the enum can be extended in a future change

## Considered Options

- Fixed enum dropdown: `B01, L00, L01, L02, L03, L04, L05` (code) + optional free-text display name
- Free text for both code and display name
- Numeric integer level number with sign (negative = basement)

## Decision Outcome

Chosen option: "Fixed enum `B01, L00, L01, L02, L03, L04, L05` with optional display name", because it enforces a stable, predictable key space for downstream processing while giving users flexibility to attach a project-specific display name. The range covers 1 basement level plus 6 above-ground levels (ground = L00), matching the current project scope.

Coding convention:
- `B01`: first basement (lowest in current range)
- `L00`: ground floor / entry level
- `L01`–`L05`: upper floors 1 through 5
- Display name: optional free text stored alongside code, e.g. "Ground Floor / Lobby", "Mezzanine"

### Consequences

- Good, because canonical key is controlled — downstream processing joins on `label_code` without normalisation.
- Good, because display name decoupling means UI labels can change without affecting stored keys or downstream logic.
- Good, because the fixed range covers the vast majority of buildings in the current project scope (commercial offices, residential complexes).
- Bad, because the range B01–L05 will be insufficient for tall buildings or deep basement developments — a future change must extend the enum (add `B02`, `B03`, `L06`+) or introduce a more flexible scheme.
- Bad, because the enum is currently enforced only at the UI level (dropdown) — the database column is TEXT with no CHECK constraint. Future migration should add a CHECK constraint when the enum is stable.
- Follow-up: add a `CHECK (label_code IN (...))` constraint on the `extractions` table when the level enum is considered stable. Evaluate whether projects with more than 5 above-ground levels need the enum extended.

### Confirmation

Code review: the label panel dropdown for Floor Plan category must render exactly `B01, L00, L01, L02, L03, L04, L05` as options. The `extractions.label_code` column must store the code value (not the display name). The backend extraction endpoint must accept `label_code` and `label_display` as distinct fields.

## Pros and Cons of the Options

### Fixed enum dropdown with optional display name

- Good, because stable, predictable key space for downstream joins
- Good, because display name decoupled — user-facing label is independent of canonical key
- Good, because UI-enforced — no free-form entry errors
- Bad, because enum range is finite — must be extended for tall or deep buildings

### Free text for both code and display name

- Good, because no constraint on what can be entered — maximum flexibility
- Bad, because free-form level identifiers are unstable across projects — "GF", "G", "Ground", "L0", "0" all mean the same thing but cannot be joined without normalisation
- Bad, because downstream processing would require a normalisation step that defeats the purpose of a canonical key

### Numeric integer level number with sign

- Good, because compact and unambiguous (0 = ground, 1 = first floor, -1 = first basement)
- Good, because mathematically ordered — easy to sort
- Bad, because less readable than `L01`/`B01` in UI and logs
- Bad, because negative numbers are unconventional in dropdown UIs and require sign handling

## More Information

The `B01–L05` range is explicitly scoped to the current project phase. When projects with more complex vertical programs are onboarded, this ADR should be superseded with an extended enum or a more flexible level coding scheme. At that point, existing `extractions.label_code` values remain valid — the extension is additive.
