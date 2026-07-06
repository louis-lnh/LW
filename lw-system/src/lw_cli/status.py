from __future__ import annotations

from dataclasses import dataclass

from lw_cli.db import connect


@dataclass(frozen=True)
class ProjectStatus:
    id: int
    name: str
    path: str
    type: str
    status: str
    tracked_files: int
    last_scan_at: str | None
    last_total_files: int | None
    last_new_files: int | None
    last_modified_files: int | None
    last_deleted_files: int | None
    open_tasks: int
    notes: int

    @property
    def state(self) -> str:
        if self.last_scan_at is None:
            return "unscanned"

        changed = (
            (self.last_new_files or 0)
            + (self.last_modified_files or 0)
            + (self.last_deleted_files or 0)
        )

        if changed:
            return "changed"

        return "clean"


@dataclass(frozen=True)
class WorkspaceStatus:
    project_count: int
    tracked_files: int
    projects: list[ProjectStatus]

    @property
    def unscanned_count(self) -> int:
        return sum(1 for project in self.projects if project.state == "unscanned")

    @property
    def changed_count(self) -> int:
        return sum(1 for project in self.projects if project.state == "changed")

    @property
    def clean_count(self) -> int:
        return sum(1 for project in self.projects if project.state == "clean")

    @property
    def open_tasks(self) -> int:
        return sum(project.open_tasks for project in self.projects)

    @property
    def notes(self) -> int:
        return sum(project.notes for project in self.projects)


def get_workspace_status() -> WorkspaceStatus:
    with connect() as connection:
        project_rows = connection.execute(
            """
            SELECT
                p.id,
                p.name,
                p.path,
                p.type,
                p.status,
                COUNT(DISTINCT pf.path) AS tracked_files,
                latest.scanned_at AS last_scan_at,
                latest.total_files AS last_total_files,
                latest.new_files AS last_new_files,
                latest.modified_files AS last_modified_files,
                latest.deleted_files AS last_deleted_files,
                COUNT(DISTINCT CASE WHEN t.status = 'open' THEN t.id END) AS open_tasks,
                COUNT(DISTINCT n.id) AS notes
            FROM projects p
            LEFT JOIN project_files pf
                ON pf.project_id = p.id
                AND pf.missing_at IS NULL
            LEFT JOIN tasks t
                ON t.project_id = p.id
            LEFT JOIN notes n
                ON n.project_id = p.id
            LEFT JOIN scans latest
                ON latest.id = (
                    SELECT s.id
                    FROM scans s
                    WHERE s.project_id = p.id
                    ORDER BY s.id DESC
                    LIMIT 1
                )
            GROUP BY p.id
            ORDER BY p.updated_at DESC, p.name ASC
            """
        ).fetchall()

    projects = [
        ProjectStatus(
            id=row["id"],
            name=row["name"],
            path=row["path"],
            type=row["type"],
            status=row["status"],
            tracked_files=row["tracked_files"],
            last_scan_at=row["last_scan_at"],
            last_total_files=row["last_total_files"],
            last_new_files=row["last_new_files"],
            last_modified_files=row["last_modified_files"],
            last_deleted_files=row["last_deleted_files"],
            open_tasks=row["open_tasks"],
            notes=row["notes"],
        )
        for row in project_rows
    ]

    return WorkspaceStatus(
        project_count=len(projects),
        tracked_files=sum(project.tracked_files for project in projects),
        projects=projects,
    )
