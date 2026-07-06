from __future__ import annotations

from dataclasses import dataclass

from lw_cli.db import connect
from lw_cli.projects import ProjectRegistryError, find_project


@dataclass(frozen=True)
class FileChange:
    project_name: str
    scan_id: int
    scanned_at: str
    change_type: str
    path: str
    old_size: int | None
    new_size: int | None


def get_latest_changes(identifier: str | None = None, limit: int = 50) -> list[FileChange]:
    params: list[object] = []
    project_filter = ""

    if identifier:
        project = find_project(identifier)

        if project is None:
            raise ProjectRegistryError(f"Project not found: {identifier}")

        project_filter = "WHERE p.id = ?"
        params.append(project.id)

    params.append(limit)

    with connect() as connection:
        rows = connection.execute(
            f"""
            WITH latest_scans AS (
                SELECT project_id, MAX(id) AS scan_id
                FROM scans
                GROUP BY project_id
            )
            SELECT
                p.name AS project_name,
                s.id AS scan_id,
                s.scanned_at,
                sc.change_type,
                sc.path,
                sc.old_size,
                sc.new_size
            FROM projects p
            JOIN latest_scans ls ON ls.project_id = p.id
            JOIN scans s ON s.id = ls.scan_id
            LEFT JOIN scan_changes sc ON sc.scan_id = s.id
            {project_filter}
            ORDER BY s.id DESC, sc.id ASC
            LIMIT ?
            """,
            params,
        ).fetchall()

    return [
        FileChange(
            project_name=row["project_name"],
            scan_id=row["scan_id"],
            scanned_at=row["scanned_at"],
            change_type=row["change_type"] or "none",
            path=row["path"] or "-",
            old_size=row["old_size"],
            new_size=row["new_size"],
        )
        for row in rows
    ]
