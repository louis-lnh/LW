from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from lw_cli.db import connect
from lw_cli.projects import Project, ProjectRegistryError, find_project


@dataclass(frozen=True)
class Note:
    id: int
    project_id: int
    project_name: str
    body: str
    created_at: str


@dataclass(frozen=True)
class Task:
    id: int
    project_id: int
    project_name: str
    title: str
    status: str
    created_at: str
    completed_at: str | None


def require_project(identifier: str) -> Project:
    project = find_project(identifier)

    if project is None:
        raise ProjectRegistryError(f"Project not found: {identifier}")

    return project


def row_to_note(row: sqlite3.Row) -> Note:
    return Note(
        id=row["id"],
        project_id=row["project_id"],
        project_name=row["project_name"],
        body=row["body"],
        created_at=row["created_at"],
    )


def row_to_task(row: sqlite3.Row) -> Task:
    return Task(
        id=row["id"],
        project_id=row["project_id"],
        project_name=row["project_name"],
        title=row["title"],
        status=row["status"],
        created_at=row["created_at"],
        completed_at=row["completed_at"],
    )


def add_note(identifier: str, body: str) -> Note:
    project = require_project(identifier)
    clean_body = body.strip()

    if not clean_body:
        raise ProjectRegistryError("Note cannot be empty.")

    with connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO notes (project_id, body)
            VALUES (?, ?)
            """,
            (project.id, clean_body),
        )
        row = connection.execute(
            """
            SELECT n.*, p.name AS project_name
            FROM notes n
            JOIN projects p ON p.id = n.project_id
            WHERE n.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

    return row_to_note(row)


def list_notes(identifier: str | None = None, limit: int = 20) -> list[Note]:
    params: list[object] = []
    filter_sql = ""

    if identifier:
        project = require_project(identifier)
        filter_sql = "WHERE n.project_id = ?"
        params.append(project.id)

    params.append(limit)

    with connect() as connection:
        rows = connection.execute(
            f"""
            SELECT n.*, p.name AS project_name
            FROM notes n
            JOIN projects p ON p.id = n.project_id
            {filter_sql}
            ORDER BY n.id DESC
            LIMIT ?
            """,
            params,
        ).fetchall()

    return [row_to_note(row) for row in rows]


def add_task(identifier: str, title: str) -> Task:
    project = require_project(identifier)
    clean_title = title.strip()

    if not clean_title:
        raise ProjectRegistryError("Task cannot be empty.")

    with connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO tasks (project_id, title)
            VALUES (?, ?)
            """,
            (project.id, clean_title),
        )
        row = connection.execute(
            """
            SELECT t.*, p.name AS project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

    return row_to_task(row)


def list_tasks(identifier: str | None = None, include_done: bool = False) -> list[Task]:
    params: list[object] = []
    filters: list[str] = []

    if identifier:
        project = require_project(identifier)
        filters.append("t.project_id = ?")
        params.append(project.id)

    if not include_done:
        filters.append("t.status = 'open'")

    filter_sql = f"WHERE {' AND '.join(filters)}" if filters else ""

    with connect() as connection:
        rows = connection.execute(
            f"""
            SELECT t.*, p.name AS project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            {filter_sql}
            ORDER BY
                CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
                t.id DESC
            """,
            params,
        ).fetchall()

    return [row_to_task(row) for row in rows]


def complete_task(task_id: int) -> Task:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT t.*, p.name AS project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.id = ?
            """,
            (task_id,),
        ).fetchone()

        if row is None:
            raise ProjectRegistryError(f"Task not found: {task_id}")

        connection.execute(
            """
            UPDATE tasks
            SET status = 'done',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (task_id,),
        )

        updated = connection.execute(
            """
            SELECT t.*, p.name AS project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            WHERE t.id = ?
            """,
            (task_id,),
        ).fetchone()

    return row_to_task(updated)
