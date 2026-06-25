import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./db.sqlite")
UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", "./uploads")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3010")
PORT = int(os.getenv("PORT", "8010"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS files (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  INTEGER NOT NULL REFERENCES projects(id),
            filename    TEXT NOT NULL,
            filepath    TEXT NOT NULL,
            file_type   TEXT,
            uploaded_at TEXT DEFAULT (datetime('now')),
            status      TEXT DEFAULT 'pending'
        );
    """)
    conn.commit()
    conn.close()


def seed_db():
    conn = get_db()
    row = conn.execute("SELECT COUNT(*) FROM projects").fetchone()
    if row[0] > 0:
        conn.close()
        return

    projects = [
        (
            "City Centre Office Tower",
            "12-storey commercial office development — architectural drawings package",
            [
                ("floor-plan-level-1.pdf", "floor-plan"),
                ("floor-plan-level-2-to-5.pdf", "floor-plan"),
                ("north-south-elevation.pdf", "elevation"),
            ],
        ),
        (
            "Riverside Residential Complex",
            "Mixed-use residential development — full drawing set including sections and specs",
            [
                ("ground-floor-plan.pdf", "floor-plan"),
                ("cross-section-A-A.pdf", "section"),
                ("finish-schedule.pdf", "spec"),
            ],
        ),
    ]

    upload_root = Path(UPLOAD_ROOT)

    for name, description, files in projects:
        cur = conn.execute(
            "INSERT INTO projects (name, description) VALUES (?, ?)",
            (name, description),
        )
        project_id = cur.lastrowid
        project_dir = upload_root / str(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)

        for filename, file_type in files:
            filepath = f"{project_id}/{filename}"
            file_path = upload_root / filepath
            if not file_path.exists():
                file_path.write_bytes(
                    f"%PDF-1.4\n% Placeholder PDF: {filename}\n".encode()
                )
            conn.execute(
                "INSERT INTO files (project_id, filename, filepath, file_type) VALUES (?, ?, ?, ?)",
                (project_id, filename, filepath, file_type),
            )

    conn.commit()
    conn.close()


@app.on_event("startup")
def startup():
    init_db()
    seed_db()


@app.get("/projects")
def get_projects():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, description, created_at FROM projects"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/projects/{project_id}/files")
def get_project_files(project_id: int):
    conn = get_db()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    rows = conn.execute(
        "SELECT id, filename, file_type, uploaded_at, status FROM files WHERE project_id = ?",
        (project_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/files/{file_id}")
def stream_file(file_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT filepath FROM files WHERE id = ?", (file_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="File not found")
    file_path = Path(UPLOAD_ROOT) / row["filepath"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    def iter_file():
        with open(file_path, "rb") as f:
            yield from f

    return StreamingResponse(iter_file(), media_type="application/pdf")
