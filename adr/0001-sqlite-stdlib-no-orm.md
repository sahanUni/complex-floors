---
status: "accepted"
date: 2026-06-26
decision-makers: warnakulasooriya.dabarera
consulted: ""
informed: ""
---

# Use SQLite via Python stdlib sqlite3 with No ORM

## Context and Problem Statement

The backend needs a persistent data store for projects and files. The application is a single-user local development tool at an early stage. We need to choose a database engine and access layer that minimises friction while preserving a path to future growth.

## Decision Drivers

- Zero external infrastructure — no separate database process to manage
- Minimal dependencies — fewer moving parts in local dev setup
- Fast iteration — schema changes should not require migration tooling at this stage
- Future extensibility — must not block adding an ORM or migration tool later

## Considered Options

- SQLite via Python stdlib `sqlite3`, no ORM
- SQLite via SQLAlchemy Core
- SQLite via SQLAlchemy ORM + Alembic migrations
- PostgreSQL via psycopg2 + SQLAlchemy

## Decision Outcome

Chosen option: "SQLite via Python stdlib `sqlite3`, no ORM", because the application is single-user local dev, has no concurrent write requirements, and adding an ORM layer adds dependency and abstraction overhead with no current benefit.

### Consequences

- Good, because no external dependencies beyond Python stdlib
- Good, because zero infrastructure — `db.sqlite` is a single file beside the backend process
- Good, because easy to reseed: delete `db.sqlite`, restart backend
- Bad, because raw SQL must be maintained manually as schema evolves
- Bad, because no migration history — schema changes require manual intervention or a full reseed
- Follow-up: revisit when schema complexity grows or concurrent access is needed; migrate to SQLAlchemy + Alembic at that point

### Confirmation

`requirements.txt` must not contain `sqlalchemy`, `alembic`, or any ORM package. DB access in `main.py` uses only `import sqlite3`.

## Pros and Cons of the Options

### SQLite via Python stdlib `sqlite3`, no ORM

- Good, because zero additional dependencies
- Good, because sqlite3 is battle-tested and ships with CPython
- Bad, because no query builder — SQL strings must be written and maintained manually
- Bad, because no migration framework — schema drift is a manual concern

### SQLite via SQLAlchemy Core

- Good, because query builder reduces raw SQL
- Neutral, because still no migration tooling
- Bad, because adds `sqlalchemy` dependency with no ORM benefit at this scale

### SQLite via SQLAlchemy ORM + Alembic

- Good, because full migration history and model-driven schema
- Bad, because significant setup overhead for a local dev single-user tool at MVP stage
- Bad, because Alembic migration files add maintenance burden before schema is stable

### PostgreSQL via psycopg2 + SQLAlchemy

- Good, because production-grade concurrent access and rich SQL feature set
- Bad, because requires a running PostgreSQL instance — breaks the zero-infrastructure goal
- Bad, because far exceeds current requirements

## More Information

Revisit this decision when any of the following occur: multiple concurrent users, production deployment, or schema complexity requiring tracked migrations.
