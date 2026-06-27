import os
import shutil
import sqlite3
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./db.sqlite")
UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", "./uploads")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3010")
PORT = int(os.getenv("PORT", "8010"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AnnotationCreate(BaseModel):
    page: int
    x0: float
    y0: float
    x1: float
    y1: float


class ExtractionCreate(BaseModel):
    category: str
    label_code: str
    label_display: Optional[str] = None
    note: Optional[str] = None


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

        CREATE TABLE IF NOT EXISTS annotations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id    INTEGER NOT NULL REFERENCES files(id),
            page       INTEGER NOT NULL,
            x0         REAL NOT NULL,
            y0         REAL NOT NULL,
            x1         REAL NOT NULL,
            y1         REAL NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS extractions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            annotation_id INTEGER NOT NULL REFERENCES annotations(id),
            category      TEXT NOT NULL,
            label_code    TEXT NOT NULL,
            label_display TEXT,
            note          TEXT,
            svg_path      TEXT NOT NULL,
            status        TEXT DEFAULT 'pending',
            extracted_at  TEXT,
            created_at    TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


def _minimal_pdf(title: str) -> bytes:
    obj1 = b"1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n"
    obj2 = b"2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n"
    obj3 = (
        b"3 0 obj<</Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R"
        b"/Resources<<>> /Contents 4 0 R>>endobj\n"
    )
    content = f"BT /F1 12 Tf 72 720 Td ({title}) Tj ET".encode()
    obj4 = b"4 0 obj<</Length " + str(len(content)).encode() + b">>\nstream\n" + content + b"\nendstream\nendobj\n"

    header = b"%PDF-1.4\n"
    offsets = []
    body = b""
    for obj in (obj1, obj2, obj3, obj4):
        offsets.append(len(header) + len(body))
        body += obj

    xref_pos = len(header) + len(body)
    xref = b"xref\n0 5\n0000000000 65535 f \n"
    for o in offsets:
        xref += f"{o:010d} 00000 n \n".encode()

    trailer = (
        b"trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n"
        + str(xref_pos).encode() + b"\n%%EOF\n"
    )
    return header + body + xref + trailer


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
                file_path.write_bytes(_minimal_pdf(filename))
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


@app.get("/projects/{project_id}")
def get_project(project_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT id, name, description, created_at FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return dict(row)


@app.post("/projects", status_code=201)
def create_project(body: ProjectCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        (body.name, body.description),
    )
    project_id = cur.lastrowid
    row = conn.execute(
        "SELECT id, name, description, created_at FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()
    conn.commit()
    conn.close()
    return dict(row)


@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    conn = get_db()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    file_rows = conn.execute(
        "SELECT id, filepath FROM files WHERE project_id = ?", (project_id,)
    ).fetchall()
    file_ids = [r["id"] for r in file_rows]

    if file_ids:
        placeholders = ",".join("?" * len(file_ids))
        conn.execute(
            f"""
            DELETE FROM extractions
            WHERE annotation_id IN (
                SELECT id FROM annotations WHERE file_id IN ({placeholders})
            )
            """,
            file_ids,
        )
        conn.execute(
            f"DELETE FROM annotations WHERE file_id IN ({placeholders})", file_ids
        )

    conn.execute("DELETE FROM files WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()

    project_dir = Path(UPLOAD_ROOT) / str(project_id)
    shutil.rmtree(project_dir, ignore_errors=True)

    return {"ok": True}


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


@app.get("/projects/{project_id}/extractions")
def get_project_extractions(project_id: int):
    conn = get_db()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    rows = conn.execute(
        """
        SELECT
            e.id,
            e.annotation_id,
            a.file_id,
            e.category,
            e.label_code,
            e.label_display,
            e.note,
            e.status,
            e.extracted_at
        FROM extractions e
        JOIN annotations a ON a.id = e.annotation_id
        JOIN files f ON f.id = a.file_id
        WHERE f.project_id = ?
        ORDER BY f.id, e.id
        """,
        (project_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/projects/{project_id}/files", status_code=201)
async def upload_files(project_id: int, files: List[UploadFile] = File(...)):
    conn = get_db()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    upload_root = Path(UPLOAD_ROOT)
    project_dir = upload_root / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    created = []
    for upload in files:
        filename = upload.filename or ""
        if not filename.lower().endswith(".pdf") or upload.content_type != "application/pdf":
            conn.close()
            raise HTTPException(status_code=400, detail=f"Only PDF files accepted: {filename}")

        existing = conn.execute(
            "SELECT id FROM files WHERE project_id = ? AND filename = ?",
            (project_id, filename),
        ).fetchone()
        if existing:
            conn.close()
            raise HTTPException(status_code=409, detail=f"File already exists: {filename}")

        file_bytes = await upload.read()
        dest = project_dir / filename
        dest.write_bytes(file_bytes)

        filepath = f"{project_id}/{filename}"
        cur = conn.execute(
            "INSERT INTO files (project_id, filename, filepath, file_type, status) VALUES (?, ?, ?, ?, ?)",
            (project_id, filename, filepath, "floor-plan", "pending"),
        )
        file_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, filename, file_type, uploaded_at, status FROM files WHERE id = ?",
            (file_id,),
        ).fetchone()
        created.append(dict(row))

    conn.commit()
    conn.close()
    return created


@app.post("/annotations/{annotation_id}/extract", status_code=201)
def extract_annotation(annotation_id: int, body: ExtractionCreate):
    conn = get_db()
    row = conn.execute(
        """
        SELECT
            a.id,
            a.page,
            a.x0,
            a.y0,
            a.x1,
            a.y1,
            f.project_id,
            f.filepath
        FROM annotations a
        JOIN files f ON f.id = a.file_id
        WHERE a.id = ?
        """,
        (annotation_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Annotation not found")

    project_id = row["project_id"]
    pdf_path = Path(UPLOAD_ROOT) / row["filepath"]
    svg_relative_path = f"{project_id}/extractions/{annotation_id}.svg"
    svg_path = Path(UPLOAD_ROOT) / svg_relative_path

    try:
        import fitz

        svg_path.parent.mkdir(parents=True, exist_ok=True)
        with fitz.open(pdf_path) as src_doc:
            src_page = src_doc[row["page"] - 1]
            # Annotation coords are in PDF user space (origin bottom-left, y upward).
            # fitz device space has origin top-left with y downward, so flip y.
            ph = src_page.rect.height
            clip = fitz.Rect(
                row["x0"],
                ph - row["y1"],  # PDF top → device top (smaller y)
                row["x1"],
                ph - row["y0"],  # PDF bottom → device bottom (larger y)
            )
            with fitz.open() as tmp_doc:
                tmp_page = tmp_doc.new_page(width=clip.width, height=clip.height)
                tmp_page.show_pdf_page(
                    fitz.Rect(0, 0, clip.width, clip.height),
                    src_doc,
                    row["page"] - 1,
                    clip=clip,
                )
                svg = tmp_page.get_svg_image()
        svg_path.write_text(svg, encoding="utf-8")
    except Exception as exc:
        conn.close()
        raise HTTPException(status_code=500, detail="Extraction failed") from exc

    cur = conn.execute(
        """
        INSERT INTO extractions (
            annotation_id,
            category,
            label_code,
            label_display,
            note,
            svg_path,
            status,
            extracted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'done', datetime('now'))
        """,
        (
            annotation_id,
            body.category,
            body.label_code,
            body.label_display,
            body.note,
            svg_relative_path,
        ),
    )
    extraction_id = cur.lastrowid
    record = conn.execute(
        """
        SELECT
            id,
            annotation_id,
            category,
            label_code,
            label_display,
            note,
            status,
            extracted_at
        FROM extractions
        WHERE id = ?
        """,
        (extraction_id,),
    ).fetchone()
    conn.commit()
    conn.close()
    return dict(record)


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


@app.get("/extractions/{extraction_id}")
def stream_extraction(extraction_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT svg_path FROM extractions WHERE id = ?", (extraction_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Extraction not found")
    svg_path = Path(UPLOAD_ROOT) / row["svg_path"]
    if not svg_path.exists():
        raise HTTPException(status_code=404, detail="Extraction file not found")
    return Response(content=svg_path.read_bytes(), media_type="image/svg+xml")


@app.get("/files/{file_id}/annotations")
def get_annotations(file_id: int):
    conn = get_db()
    file_row = conn.execute("SELECT id FROM files WHERE id = ?", (file_id,)).fetchone()
    if not file_row:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")
    rows = conn.execute(
        "SELECT id, file_id, page, x0, y0, x1, y1, created_at FROM annotations WHERE file_id = ?",
        (file_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/files/{file_id}/annotations", status_code=201)
def create_annotation(file_id: int, body: AnnotationCreate):
    conn = get_db()
    file_row = conn.execute("SELECT id FROM files WHERE id = ?", (file_id,)).fetchone()
    if not file_row:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")
    cur = conn.execute(
        "INSERT INTO annotations (file_id, page, x0, y0, x1, y1) VALUES (?, ?, ?, ?, ?, ?)",
        (file_id, body.page, body.x0, body.y0, body.x1, body.y1),
    )
    ann_id = cur.lastrowid
    row = conn.execute(
        "SELECT id, file_id, page, x0, y0, x1, y1, created_at FROM annotations WHERE id = ?",
        (ann_id,),
    ).fetchone()
    conn.commit()
    conn.close()
    return dict(row)


@app.delete("/annotations/{annotation_id}", status_code=204)
def delete_annotation(annotation_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM annotations WHERE id = ?", (annotation_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return Response(status_code=204)
