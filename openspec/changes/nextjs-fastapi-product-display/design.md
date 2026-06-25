## Context

Greenfield smoke-test: two new services, no existing code to integrate with. Backend is a FastAPI app serving static product data. Frontend is a Next.js app that fetches and renders that data.

## Goals / Non-Goals

**Goals:**
- FastAPI app with 3 hardcoded products at `GET /products`
- CORS enabled for `localhost:3000`
- Next.js app fetches from backend and renders product name + price
- Both apps start independently and communicate successfully

**Non-Goals:**
- Auth, persistence, search, pagination
- Docker / containerization
- Production deployment config
- Error states beyond basic fetch failure

## Decisions

**1. In-memory data store**
Simple Python list of dicts. No DB, no ORM.
Rationale: smoke test only — fastest path to a working API.

**2. Next.js fetching strategy**
Use `fetch` in a Server Component (App Router) — no client-side JS needed for a static list.
Rationale: simplest approach, avoids `useEffect` + loading state complexity.

**3. Port assignments**
- Backend: `8010` (uvicorn default)
- Frontend: `3010` (Next.js default)
Rationale: standard defaults, no config needed.

**4. CORS**
`fastapi.middleware.cors.CORSMiddleware` with `allow_origins=["http://localhost:3010"]`.
Rationale: explicit allowlist, not wildcard.

## Risks / Trade-offs

- Server Component fetch hits backend at request time → backend must be running before frontend loads. Mitigation: document startup order in README.
- No `.env` for backend URL → hardcoded `localhost:8010`. Acceptable for smoke test only.

## Migration Plan

N/A — new code, nothing to migrate or roll back.

## Open Questions

None. Scope is intentionally minimal.
