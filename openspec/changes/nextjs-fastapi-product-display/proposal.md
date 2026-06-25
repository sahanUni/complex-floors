## Why

Verify full-stack integration between a NextJS frontend and FastAPI backend before building real features. Confirms dev environment, tooling, and service communication all work end-to-end.

## What Changes

- New `frontend/` directory: NextJS app
- New `backend/` directory: FastAPI app with in-memory product store
- 3 hardcoded products with prices served via REST API
- NextJS page fetches and displays the product list

## Capabilities

### New Capabilities
- `product-listing`: Fetch product list from FastAPI backend and display in NextJS frontend

### Modified Capabilities
<!-- none -->

## Impact

- New top-level dirs: `frontend/`, `backend/`
- No existing code touched
- Dependencies: Node.js + npm (Next.js), Python + pip (FastAPI, uvicorn)
- Backend runs on port 8010, frontend on port 3010
- CORS must be configured on FastAPI to allow requests from localhost:3010
