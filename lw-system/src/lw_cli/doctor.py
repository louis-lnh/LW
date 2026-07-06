from __future__ import annotations

import platform
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

from lw_cli.config import get_config_path, load_config
from lw_cli.db import connect
from lw_cli.projects import list_projects


@dataclass(frozen=True)
class HealthCheck:
    status: str
    name: str
    detail: str


def run_doctor() -> list[HealthCheck]:
    checks: list[HealthCheck] = []

    config = load_config()
    config_path = get_config_path()

    checks.append(path_exists_check("Config file", config_path))
    checks.append(path_exists_check("Data directory", Path(config.data_dir), expected_type="dir"))
    checks.append(path_exists_check("Reports directory", Path(config.reports_dir), expected_type="dir"))
    checks.append(path_exists_check("Projects directory", Path(config.projects_dir), expected_type="dir"))
    checks.append(database_check())
    checks.append(
        HealthCheck(
            status="ok",
            name="Python runtime",
            detail=f"{platform.python_implementation()} {platform.python_version()} at {sys.executable}",
        )
    )

    projects = list_projects()

    if projects:
        checks.append(
            HealthCheck(
                status="ok",
                name="Tracked projects",
                detail=f"{len(projects)} project(s) tracked",
            )
        )
    else:
        checks.append(
            HealthCheck(
                status="warn",
                name="Tracked projects",
                detail="No projects tracked yet",
            )
        )

    with connect() as connection:
        for project in projects:
            project_path = Path(project.path)
            checks.append(
                path_exists_check(
                    f"Project path: {project.name}",
                    project_path,
                    expected_type="dir",
                )
            )

            scan_row = connection.execute(
                """
                SELECT scanned_at, total_files
                FROM scans
                WHERE project_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (project.id,),
            ).fetchone()

            if scan_row is None:
                checks.append(
                    HealthCheck(
                        status="warn",
                        name=f"Latest scan: {project.name}",
                        detail="Project has not been scanned",
                    )
                )
            else:
                checks.append(
                    HealthCheck(
                        status="ok",
                        name=f"Latest scan: {project.name}",
                        detail=f"{scan_row['scanned_at']} ({scan_row['total_files']} files)",
                    )
                )

    return checks


def path_exists_check(name: str, path: Path, expected_type: str | None = None) -> HealthCheck:
    if not path.exists():
        return HealthCheck(status="fail", name=name, detail=f"Missing: {path}")

    if expected_type == "dir" and not path.is_dir():
        return HealthCheck(status="fail", name=name, detail=f"Expected folder: {path}")

    if expected_type == "file" and not path.is_file():
        return HealthCheck(status="fail", name=name, detail=f"Expected file: {path}")

    return HealthCheck(status="ok", name=name, detail=str(path))


def database_check() -> HealthCheck:
    try:
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
    except sqlite3.Error as error:
        return HealthCheck(status="fail", name="Database", detail=str(error))

    config = load_config()
    return HealthCheck(status="ok", name="Database", detail=config.database_path)
