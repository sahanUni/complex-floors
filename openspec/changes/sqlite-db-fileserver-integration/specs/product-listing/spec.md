## REMOVED Requirements

### Requirement: Product list endpoint
**Reason**: Smoke test artefact. Project has pivoted to floor plan analysis / BOQ generation. Products domain is replaced by Projects and Files.
**Migration**: Remove `GET /products` endpoint from backend. Replace frontend product display with project/file display. See `project-management` and `file-storage` capabilities.

### Requirement: Product listing page
**Reason**: Smoke test artefact. Frontend page now displays projects and associated files instead of products.
**Migration**: Replace `page.tsx` product list UI with project list UI. `Product` TypeScript interface removed. API URL now sourced from `NEXT_PUBLIC_API_URL` env var.
