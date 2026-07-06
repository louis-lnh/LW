from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from lw_cli.changes import FileChange, get_latest_changes
from lw_cli.config import load_config
from lw_cli.context import Note, Task, list_notes, list_tasks
from lw_cli.projects import ProjectRegistryError, find_project
from lw_cli.status import ProjectStatus, WorkspaceStatus, get_workspace_status


@dataclass(frozen=True)
class ReportResult:
    path: Path
    title: str


def generate_report(identifier: str | None = None, limit: int = 50) -> ReportResult:
    workspace_status = get_workspace_status()

    if identifier:
        project = find_project(identifier)

        if project is None:
            raise ProjectRegistryError(f"Project not found: {identifier}")

        projects = [project_status for project_status in workspace_status.projects if project_status.id == project.id]
        title = f"{project.name} Report"
        slug = slugify(project.name)
    else:
        projects = workspace_status.projects
        title = "Workspace Report"
        slug = "workspace"

    changes = get_latest_changes(identifier, limit)
    notes = list_notes(identifier, limit=10)
    tasks = list_tasks(identifier, include_done=False)
    content = build_markdown_report(
        title,
        workspace_status,
        projects,
        changes,
        notes,
        tasks,
        identifier,
    )
    report_path = write_report(slug, content)

    return ReportResult(path=report_path, title=title)


def build_markdown_report(
    title: str,
    workspace_status: WorkspaceStatus,
    projects: list[ProjectStatus],
    changes: list[FileChange],
    notes: list[Note],
    tasks: list[Task],
    identifier: str | None,
) -> str:
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines: list[str] = [
        f"# {title}",
        "",
        f"Generated: {generated_at}",
        "",
    ]

    if identifier is None:
        lines.extend(
            [
                "## Workspace Summary",
                "",
                f"- Tracked projects: {workspace_status.project_count}",
                f"- Tracked files: {workspace_status.tracked_files}",
                f"- Open tasks: {workspace_status.open_tasks}",
                f"- Notes: {workspace_status.notes}",
                f"- Clean projects: {workspace_status.clean_count}",
                f"- Changed projects: {workspace_status.changed_count}",
                f"- Unscanned projects: {workspace_status.unscanned_count}",
                "",
            ]
        )

    lines.extend(["## Projects", ""])

    if not projects:
        lines.extend(["No projects found.", ""])
    else:
        lines.extend(
            [
                "| Project | State | Files | Tasks | Notes | Last scan | New | Modified | Deleted | Next action |",
                "|---|---|---:|---:|---:|---|---:|---:|---:|---|",
            ]
        )

        for project in projects:
            lines.append(
                "| "
                f"{project.name} | "
                f"{project.state} | "
                f"{project.tracked_files} | "
                f"{project.open_tasks} | "
                f"{project.notes} | "
                f"{project.last_scan_at or '-'} | "
                f"{project.last_new_files or 0} | "
                f"{project.last_modified_files or 0} | "
                f"{project.last_deleted_files or 0} | "
                f"{next_action(project)} |"
            )

        lines.append("")

    lines.extend(["## Latest File Changes", ""])
    visible_changes = [change for change in changes if change.change_type != "none"]

    if not changes:
        lines.extend(["No scans recorded yet.", ""])
    elif not visible_changes:
        lines.extend(["No file-level changes recorded for the latest scan.", ""])
    else:
        lines.extend(
            [
                "| Project | Scan | Type | Size | Path |",
                "|---|---|---|---|---|",
            ]
        )

        for change in visible_changes:
            lines.append(
                "| "
                f"{change.project_name} | "
                f"{change.scanned_at} | "
                f"{change.change_type} | "
                f"{size_change(change)} | "
                f"`{change.path}` |"
            )

        lines.append("")

    lines.extend(["## Open Tasks", ""])

    if not tasks:
        lines.extend(["No open tasks.", ""])
    else:
        lines.extend(
            [
                "| ID | Project | Task | Created |",
                "|---:|---|---|---|",
            ]
        )

        for task in tasks:
            lines.append(
                "| "
                f"{task.id} | "
                f"{task.project_name} | "
                f"{task.title} | "
                f"{task.created_at} |"
            )

        lines.append("")

    lines.extend(["## Recent Notes", ""])

    if not notes:
        lines.extend(["No notes recorded.", ""])
    else:
        lines.extend(
            [
                "| ID | Project | Note | Created |",
                "|---:|---|---|---|",
            ]
        )

        for note in notes:
            lines.append(
                "| "
                f"{note.id} | "
                f"{note.project_name} | "
                f"{note.body} | "
                f"{note.created_at} |"
            )

        lines.append("")

    lines.extend(["## Suggested Next Steps", ""])
    next_steps = suggested_next_steps(projects, changes, tasks)

    for step in next_steps:
        lines.append(f"- {step}")

    lines.append("")
    return "\n".join(lines)


def write_report(slug: str, content: str) -> Path:
    config = load_config()
    reports_dir = Path(config.reports_dir)
    reports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = reports_dir / f"{slug}-report-{timestamp}.md"
    path.write_text(content, encoding="utf-8")
    return path


def slugify(value: str) -> str:
    chars = [char.lower() if char.isalnum() else "-" for char in value]
    slug = "".join(chars).strip("-")

    while "--" in slug:
        slug = slug.replace("--", "-")

    return slug or "project"


def next_action(project: ProjectStatus) -> str:
    if project.state == "unscanned":
        return f"Run lw scan {project.name}"

    if project.state == "changed":
        return "Review latest file changes"

    return "No action"


def size_change(change: FileChange) -> str:
    if change.change_type == "new":
        return f"- -> {change.new_size}"

    if change.change_type == "deleted":
        return f"{change.old_size} -> -"

    if change.change_type == "modified":
        return f"{change.old_size} -> {change.new_size}"

    return "-"


def suggested_next_steps(
    projects: list[ProjectStatus],
    changes: list[FileChange],
    tasks: list[Task],
) -> list[str]:
    if not projects:
        return ["Add a project with lw project add."]

    steps: list[str] = []

    for project in projects:
        if project.state == "unscanned":
            steps.append(f"Scan {project.name}.")
        elif project.state == "changed":
            steps.append(f"Review latest changes for {project.name}.")

    if tasks:
        steps.append(f"Review {len(tasks)} open task(s).")

    if not steps and any(change.change_type != "none" for change in changes):
        steps.append("Review the latest file changes.")

    if not steps:
        steps.append("No action needed. Workspace is clean.")

    return steps
