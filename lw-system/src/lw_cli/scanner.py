from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from lw_cli.db import connect
from lw_cli.projects import Project, ProjectRegistryError, find_project, list_projects


IGNORED_DIRS = {
    ".git",
    ".gradle",
    ".hg",
    ".svn",
    ".venv",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
}


@dataclass(frozen=True)
class FileRecord:
    path: str
    size: int
    modified_at: float


@dataclass(frozen=True)
class ScanResult:
    project: Project
    total_files: int
    new_files: int
    modified_files: int
    deleted_files: int
    scan_id: int


def iter_project_files(root: Path) -> list[FileRecord]:
    records: list[FileRecord] = []

    for path in root.rglob("*"):
        if any(part in IGNORED_DIRS for part in path.parts):
            continue

        if not path.is_file():
            continue

        stat = path.stat()
        records.append(
            FileRecord(
                path=path.relative_to(root).as_posix(),
                size=stat.st_size,
                modified_at=stat.st_mtime,
            )
        )

    return records


def is_ignored_relative_path(path: str) -> bool:
    return any(part in IGNORED_DIRS for part in Path(path).parts)


def scan_project(project: Project) -> ScanResult:
    root = Path(project.path)

    if not root.exists() or not root.is_dir():
        raise ProjectRegistryError(f"Project folder is missing: {project.path}")

    current_files = iter_project_files(root)
    current_paths = {record.path for record in current_files}

    with connect() as connection:
        previous_rows = connection.execute(
            """
            SELECT path, size, modified_at
            FROM project_files
            WHERE project_id = ? AND missing_at IS NULL
            """,
            (project.id,),
        ).fetchall()

        ignored_previous_paths = [
            row["path"] for row in previous_rows if is_ignored_relative_path(row["path"])
        ]

        for ignored_path in ignored_previous_paths:
            connection.execute(
                """
                DELETE FROM project_files
                WHERE project_id = ? AND path = ?
                """,
                (project.id, ignored_path),
            )

        previous = {
            row["path"]: row
            for row in previous_rows
            if not is_ignored_relative_path(row["path"])
        }
        change_rows: list[tuple[str, str, int | None, int | None, float | None, float | None]] = []

        for record in current_files:
            old = previous.get(record.path)

            if old is None:
                change_rows.append(
                    ("new", record.path, None, record.size, None, record.modified_at)
                )
            elif old["size"] != record.size or old["modified_at"] != record.modified_at:
                change_rows.append(
                    (
                        "modified",
                        record.path,
                        old["size"],
                        record.size,
                        old["modified_at"],
                        record.modified_at,
                    )
                )

            connection.execute(
                """
                INSERT INTO project_files (project_id, path, size, modified_at, missing_at)
                VALUES (?, ?, ?, ?, NULL)
                ON CONFLICT(project_id, path) DO UPDATE SET
                    size = excluded.size,
                    modified_at = excluded.modified_at,
                    last_seen_at = CURRENT_TIMESTAMP,
                    missing_at = NULL
                """,
                (project.id, record.path, record.size, record.modified_at),
            )

        deleted_paths = set(previous) - current_paths

        for path in deleted_paths:
            old = previous[path]
            change_rows.append(
                ("deleted", path, old["size"], None, old["modified_at"], None)
            )
            connection.execute(
                """
                UPDATE project_files
                SET missing_at = CURRENT_TIMESTAMP
                WHERE project_id = ? AND path = ?
                """,
                (project.id, path),
            )

        new_files = sum(1 for change in change_rows if change[0] == "new")
        modified_files = sum(1 for change in change_rows if change[0] == "modified")
        deleted_files = sum(1 for change in change_rows if change[0] == "deleted")

        cursor = connection.execute(
            """
            INSERT INTO scans (project_id, total_files, new_files, modified_files, deleted_files)
            VALUES (?, ?, ?, ?, ?)
            """,
            (project.id, len(current_files), new_files, modified_files, deleted_files),
        )
        scan_id = cursor.lastrowid

        connection.executemany(
            """
            INSERT INTO scan_changes (
                scan_id,
                project_id,
                change_type,
                path,
                old_size,
                new_size,
                old_modified_at,
                new_modified_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    scan_id,
                    project.id,
                    change_type,
                    path,
                    old_size,
                    new_size,
                    old_modified_at,
                    new_modified_at,
                )
                for (
                    change_type,
                    path,
                    old_size,
                    new_size,
                    old_modified_at,
                    new_modified_at,
                ) in change_rows
            ],
        )

        connection.execute(
            """
            UPDATE projects
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (project.id,),
        )

    return ScanResult(
        project=project,
        total_files=len(current_files),
        new_files=new_files,
        modified_files=modified_files,
        deleted_files=deleted_files,
        scan_id=scan_id,
    )


def scan(identifier: str | None = None) -> list[ScanResult]:
    if identifier:
        project = find_project(identifier)

        if project is None:
            raise ProjectRegistryError(f"Project not found: {identifier}")

        return [scan_project(project)]

    projects = list_projects()

    if not projects:
        return []

    return [scan_project(project) for project in projects]
