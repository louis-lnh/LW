from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

from lw_cli.db import connect


@dataclass(frozen=True)
class Project:
    id: int
    name: str
    path: str
    type: str
    status: str
    tags: str
    created_at: str
    updated_at: str


class ProjectRegistryError(Exception):
    """Raised when a project registry action cannot be completed."""


def row_to_project(row: sqlite3.Row) -> Project:
    return Project(
        id=row["id"],
        name=row["name"],
        path=row["path"],
        type=row["type"],
        status=row["status"],
        tags=row["tags"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def normalize_project_path(path: str) -> str:
    resolved = Path(path).expanduser().resolve()

    if not resolved.exists():
        raise ProjectRegistryError(f"Project path does not exist: {resolved}")

    if not resolved.is_dir():
        raise ProjectRegistryError(f"Project path is not a folder: {resolved}")

    return str(resolved)


def add_project(
    name: str,
    path: str,
    project_type: str = "general",
    status: str = "active",
    tags: str = "",
) -> Project:
    clean_name = name.strip()

    if not clean_name:
        raise ProjectRegistryError("Project name cannot be empty.")

    clean_path = normalize_project_path(path)

    try:
        with connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO projects (name, path, type, status, tags)
                VALUES (?, ?, ?, ?, ?)
                """,
                (clean_name, clean_path, project_type.strip(), status.strip(), tags.strip()),
            )
            row = connection.execute(
                "SELECT * FROM projects WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        message = str(error).lower()

        if "projects.name" in message:
            raise ProjectRegistryError(f"Project already exists: {clean_name}") from error

        if "projects.path" in message:
            raise ProjectRegistryError(f"Project path is already tracked: {clean_path}") from error

        raise ProjectRegistryError("Project could not be added.") from error

    return row_to_project(row)


def list_projects() -> list[Project]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM projects ORDER BY updated_at DESC, name ASC"
        ).fetchall()

    return [row_to_project(row) for row in rows]


def find_project(identifier: str) -> Project | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT * FROM projects
            WHERE name = ? OR CAST(id AS TEXT) = ?
            """,
            (identifier, identifier),
        ).fetchone()

    if row is None:
        return None

    return row_to_project(row)


def remove_project(identifier: str) -> Project:
    project = find_project(identifier)

    if project is None:
        raise ProjectRegistryError(f"Project not found: {identifier}")

    with connect() as connection:
        connection.execute("DELETE FROM projects WHERE id = ?", (project.id,))

    return project
