from __future__ import annotations

from dataclasses import asdict
from typing import Any

from lw_cli.context import list_notes, list_tasks
from lw_cli.status import ProjectStatus, WorkspaceStatus, get_workspace_status


def project_status_to_dict(project: ProjectStatus) -> dict[str, Any]:
    data = asdict(project)
    data["state"] = project.state
    data["last_changes"] = {
        "new": project.last_new_files or 0,
        "modified": project.last_modified_files or 0,
        "deleted": project.last_deleted_files or 0,
    }
    return data


def workspace_status_to_dict(status: WorkspaceStatus) -> dict[str, Any]:
    return {
        "project_count": status.project_count,
        "tracked_files": status.tracked_files,
        "open_tasks": status.open_tasks,
        "notes": status.notes,
        "clean_count": status.clean_count,
        "changed_count": status.changed_count,
        "unscanned_count": status.unscanned_count,
        "projects": [project_status_to_dict(project) for project in status.projects],
    }


def get_desktop_snapshot() -> dict[str, Any]:
    status = get_workspace_status()
    notes = list_notes(limit=6)
    tasks = list_tasks(include_done=False)

    return {
        "status": workspace_status_to_dict(status),
        "notes": [asdict(note) for note in notes],
        "tasks": [asdict(task) for task in tasks],
    }
