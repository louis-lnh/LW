from __future__ import annotations

from dataclasses import dataclass

from lw_cli.changes import get_latest_changes
from lw_cli.context import list_notes, list_tasks
from lw_cli.projects import ProjectRegistryError, find_project
from lw_cli.status import ProjectStatus, get_workspace_status


@dataclass(frozen=True)
class ProjectSuggestion:
    project_name: str
    observations: list[str]
    next_steps: list[str]


def get_suggestions(identifier: str | None = None) -> list[ProjectSuggestion]:
    workspace_status = get_workspace_status()

    if identifier:
        project = find_project(identifier)

        if project is None:
            raise ProjectRegistryError(f"Project not found: {identifier}")

        projects = [
            project_status
            for project_status in workspace_status.projects
            if project_status.id == project.id
        ]
    else:
        projects = workspace_status.projects

    return [suggest_for_project(project) for project in projects]


def suggest_for_project(project: ProjectStatus) -> ProjectSuggestion:
    notes = list_notes(project.name, limit=3)
    open_tasks = list_tasks(project.name, include_done=False)
    changes = get_latest_changes(project.name, limit=10)
    visible_changes = [change for change in changes if change.change_type != "none"]

    observations: list[str] = []
    next_steps: list[str] = []

    if project.state == "unscanned":
        observations.append("Project has not been scanned yet.")
        next_steps.append(f"Run lw scan {project.name}.")
    elif project.state == "changed":
        observations.append(
            f"Latest scan found {project.last_new_files or 0} new, "
            f"{project.last_modified_files or 0} modified, "
            f"{project.last_deleted_files or 0} deleted."
        )
        next_steps.append(f"Run lw changes {project.name} and review the file list.")
    else:
        observations.append("Latest scan is clean.")

    if open_tasks:
        observations.append(f"{len(open_tasks)} open task(s) found.")
        next_steps.append(f"Work through the next open task: {open_tasks[0].title}")
    else:
        observations.append("No open tasks.")

        if project.state == "clean":
            next_steps.append("Add one concrete task if there is active work to do.")

    if notes:
        observations.append(f"{len(notes)} recent note(s) available.")
        observations.append(f"Latest note: {notes[0].body}")
    else:
        observations.append("No notes recorded yet.")
        next_steps.append(f"Add a note for {project.name} if there is important context.")

    if visible_changes:
        change_types = sorted({change.change_type for change in visible_changes})
        observations.append(f"Latest file-level changes include: {', '.join(change_types)}.")

    if not next_steps:
        next_steps.append("Generate a report if you want a saved snapshot.")

    return ProjectSuggestion(
        project_name=project.name,
        observations=dedupe(observations),
        next_steps=dedupe(next_steps),
    )


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)

    return result
