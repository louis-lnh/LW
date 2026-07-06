from __future__ import annotations

import json

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from lw_cli import __version__
from lw_cli.changes import FileChange, get_latest_changes
from lw_cli.config import get_config_path, load_config, set_config_value
from lw_cli.context import (
    Note,
    Task,
    add_note,
    add_task,
    complete_task,
    list_notes,
    list_tasks,
)
from lw_cli.desktop import get_desktop_snapshot
from lw_cli.doctor import HealthCheck, run_doctor
from lw_cli.projects import (
    Project,
    ProjectRegistryError,
    add_project,
    find_project,
    list_projects,
    remove_project,
)
from lw_cli.reports import generate_report
from lw_cli.scanner import ScanResult, scan
from lw_cli.shell import run_shell
from lw_cli.status import ProjectStatus, WorkspaceStatus, get_workspace_status
from lw_cli.suggestions import ProjectSuggestion, get_suggestions


app = typer.Typer(
    name="lw",
    help="Local-first command center for projects, files, notes, and agent workflows.",
    no_args_is_help=False,
)
config_app = typer.Typer(help="Show and manage local Luigi's World configuration.")
desktop_app = typer.Typer(help="Machine-readable commands for the desktop app.")
note_app = typer.Typer(help="Capture project notes.")
project_app = typer.Typer(help="Track and inspect local projects.")
task_app = typer.Typer(help="Track project tasks.")
app.add_typer(config_app, name="config")
app.add_typer(desktop_app, name="app")
app.add_typer(note_app, name="note")
app.add_typer(project_app, name="project")
app.add_typer(task_app, name="task")

console = Console()


@app.callback(invoke_without_command=True)
def root(ctx: typer.Context) -> None:
    """Show the Luigi's World welcome panel."""
    if ctx.invoked_subcommand is not None:
        return

    console.print(
        Panel.fit(
            "[bold]Luigi's World[/bold]\n"
            "Local-first command center for projects, files, notes, and future agents.\n\n"
            "[dim]Try:[/dim] lw about  [dim]or[/dim]  lw config show",
            title="lw",
            border_style="cyan",
        )
    )


@app.command()
def about() -> None:
    """Describe what Luigi's World is."""
    console.print(
        Panel.fit(
            "Luigi's World is a local-first desktop CLI for managing projects, files, "
            "notes, reports, and future agent workflows from one personal workspace.",
            title="About",
            border_style="cyan",
        )
    )


@app.command("version")
def show_version() -> None:
    """Show the installed Luigi's World version."""
    console.print(f"Luigi's World [bold]{__version__}[/bold]")


@app.command("shell")
def shell_command() -> None:
    """Open the interactive Luigi's World shell."""
    run_shell()


@app.command("doctor")
def doctor_command() -> None:
    """Run health checks for the local LW setup."""
    checks = run_doctor()
    print_doctor_table(checks)

    failed = [check for check in checks if check.status == "fail"]
    warnings = [check for check in checks if check.status == "warn"]

    if failed:
        console.print(f"[red]Result:[/red] {len(failed)} failing check(s)")
        raise typer.Exit(code=1)

    if warnings:
        console.print(f"[yellow]Result:[/yellow] healthy with {len(warnings)} warning(s)")
        return

    console.print("[green]Result:[/green] healthy")


@app.command("scan")
def scan_command(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
) -> None:
    """Scan tracked project files and record changes."""
    try:
        results = scan(identifier)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    if not results:
        console.print("[yellow]No projects tracked yet.[/yellow]")
        console.print("[dim]Try:[/dim] lw project add \"Lifesteal\" --path \"B:/LS\"")
        return

    print_scan_table(results)


@app.command("status")
def status_command() -> None:
    """Show the latest known workspace status."""
    workspace_status = get_workspace_status()

    if workspace_status.project_count == 0:
        console.print("[yellow]No projects tracked yet.[/yellow]")
        console.print("[dim]Try:[/dim] lw project add \"Lifesteal\" --path \"B:/LS\"")
        return

    print_status_summary(workspace_status)
    print_status_table(workspace_status.projects)


@app.command("changes")
def changes_command(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
    limit: int = typer.Option(50, "--limit", "-n", min=1, max=500, help="Maximum rows to show."),
) -> None:
    """Show file-level changes from the latest scan."""
    try:
        changes = get_latest_changes(identifier, limit)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    if not changes:
        console.print("[yellow]No scans recorded yet.[/yellow]")
        console.print("[dim]Try:[/dim] lw scan")
        return

    print_changes_table(changes)


@app.command("report")
def report_command(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
    limit: int = typer.Option(50, "--limit", "-n", min=1, max=500, help="Maximum file changes to include."),
) -> None:
    """Generate a Markdown status report."""
    try:
        report = generate_report(identifier, limit)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Report written:[/green] [bold]{report.title}[/bold]")
    console.print(str(report.path))


@app.command("suggest")
def suggest_command(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
) -> None:
    """Suggest practical next steps from current project context."""
    try:
        suggestions = get_suggestions(identifier)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    if not suggestions:
        console.print("[yellow]No projects tracked yet.[/yellow]")
        console.print("[dim]Try:[/dim] lw project add \"Lifesteal\" --path \"B:/LS\"")
        return

    print_suggestions(suggestions)


@desktop_app.command("snapshot")
def app_snapshot() -> None:
    """Print a JSON snapshot for the desktop app."""
    console.print_json(json.dumps(get_desktop_snapshot()))


@config_app.command("path")
def config_path() -> None:
    """Show where the local config file is stored."""
    console.print(str(get_config_path()))


@config_app.command("show")
def config_show() -> None:
    """Show the current local configuration."""
    config = load_config()

    table = Table(title="Luigi's World Config", show_header=True, header_style="bold cyan")
    table.add_column("Key", style="bold")
    table.add_column("Value")

    table.add_row("app_name", config.app_name)
    table.add_row("data_dir", config.data_dir)
    table.add_row("database_path", config.database_path)
    table.add_row("reports_dir", config.reports_dir)
    table.add_row("projects_dir", config.projects_dir)

    console.print(table)


@config_app.command("set")
def config_set(
    key: str = typer.Argument(..., help="Config key to update."),
    value: str = typer.Argument(..., help="New config value."),
) -> None:
    """Update one local configuration value."""
    try:
        updated = set_config_value(key, value)
    except ValueError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Updated config:[/green] [bold]{key}[/bold]")
    console.print(getattr(updated, key))


def print_project_table(projects: list[Project]) -> None:
    table = Table(title="Tracked Projects", show_header=True, header_style="bold cyan")
    table.add_column("ID", justify="right")
    table.add_column("Name", style="bold")
    table.add_column("Type")
    table.add_column("Status")
    table.add_column("Path")

    for project in projects:
        table.add_row(
            str(project.id),
            project.name,
            project.type,
            project.status,
            project.path,
        )

    console.print(table)


def print_project_details(project: Project) -> None:
    table = Table(title=project.name, show_header=False)
    table.add_column("Key", style="bold cyan")
    table.add_column("Value")

    table.add_row("id", str(project.id))
    table.add_row("name", project.name)
    table.add_row("path", project.path)
    table.add_row("type", project.type)
    table.add_row("status", project.status)
    table.add_row("tags", project.tags or "-")
    table.add_row("created_at", project.created_at)
    table.add_row("updated_at", project.updated_at)

    console.print(table)


def print_scan_table(results: list[ScanResult]) -> None:
    table = Table(title="Scan Results", show_header=True, header_style="bold cyan")
    table.add_column("Project", style="bold")
    table.add_column("Files", justify="right")
    table.add_column("New", justify="right", style="green")
    table.add_column("Modified", justify="right", style="yellow")
    table.add_column("Deleted", justify="right", style="red")

    for result in results:
        table.add_row(
            result.project.name,
            str(result.total_files),
            str(result.new_files),
            str(result.modified_files),
            str(result.deleted_files),
        )

    console.print(table)


def print_status_summary(status: WorkspaceStatus) -> None:
    summary = (
        f"[bold]Tracked projects:[/bold] {status.project_count}\n"
        f"[bold]Tracked files:[/bold] {status.tracked_files}\n"
        f"[bold]Open tasks:[/bold] {status.open_tasks}   "
        f"[bold]Notes:[/bold] {status.notes}\n"
        f"[bold]Clean:[/bold] {status.clean_count}   "
        f"[bold]Changed:[/bold] {status.changed_count}   "
        f"[bold]Unscanned:[/bold] {status.unscanned_count}"
    )

    console.print(Panel.fit(summary, title="LW Status", border_style="cyan"))


def format_change_summary(project: ProjectStatus) -> str:
    if project.last_scan_at is None:
        return "-"

    return f"{project.last_new_files or 0} / {project.last_modified_files or 0} / {project.last_deleted_files or 0}"


def format_next_action(project: ProjectStatus) -> str:
    if project.state == "unscanned":
        return f"Run lw scan {project.name}"

    if project.state == "changed":
        return "Review latest scan"

    return "No action"


def format_scan_time(value: str | None) -> str:
    if value is None:
        return "-"

    if len(value) >= 16:
        return value[5:16]

    return value


def print_status_table(projects: list[ProjectStatus]) -> None:
    table = Table(title="Projects", show_header=True, header_style="bold cyan")
    table.add_column("Project", style="bold")
    table.add_column("State")
    table.add_column("Files", justify="right")
    table.add_column("T/N", justify="right")
    table.add_column("Scan")
    table.add_column("Changes", justify="right")
    table.add_column("Action")

    for project in projects:
        state_style = {
            "clean": "green",
            "changed": "yellow",
            "unscanned": "red",
        }[project.state]

        table.add_row(
            project.name,
            f"[{state_style}]{project.state}[/{state_style}]",
            str(project.tracked_files),
            f"{project.open_tasks}/{project.notes}",
            format_scan_time(project.last_scan_at),
            format_change_summary(project),
            format_next_action(project),
        )

    console.print(table)


def format_size_change(change: FileChange) -> str:
    if change.change_type == "new":
        return f"- -> {change.new_size}"

    if change.change_type == "deleted":
        return f"{change.old_size} -> -"

    if change.change_type == "modified":
        return f"{change.old_size} -> {change.new_size}"

    return "-"


def print_changes_table(changes: list[FileChange]) -> None:
    table = Table(title="Latest Changes", show_header=True, header_style="bold cyan")
    table.add_column("Project", style="bold")
    table.add_column("Scan")
    table.add_column("Type")
    table.add_column("Size")
    table.add_column("Path")

    visible_changes = [change for change in changes if change.change_type != "none"]

    if not visible_changes:
        first = changes[0]
        console.print(
            Panel.fit(
                f"No file-level changes recorded for latest scan #{first.scan_id}.\n"
                "Run lw scan after files change to see paths here.",
                title="Latest Changes",
                border_style="cyan",
            )
        )
        return

    for change in visible_changes:
        type_style = {
            "new": "green",
            "modified": "yellow",
            "deleted": "red",
        }.get(change.change_type, "white")

        table.add_row(
            change.project_name,
            change.scanned_at,
            f"[{type_style}]{change.change_type}[/{type_style}]",
            format_size_change(change),
            change.path,
        )

    console.print(table)


def print_notes_table(notes: list[Note]) -> None:
    table = Table(title="Notes", show_header=True, header_style="bold cyan")
    table.add_column("ID", justify="right")
    table.add_column("Project", style="bold")
    table.add_column("Created")
    table.add_column("Note")

    for note in notes:
        table.add_row(str(note.id), note.project_name, note.created_at, note.body)

    console.print(table)


def print_tasks_table(tasks: list[Task]) -> None:
    table = Table(title="Tasks", show_header=True, header_style="bold cyan")
    table.add_column("ID", justify="right")
    table.add_column("Project", style="bold")
    table.add_column("Status")
    table.add_column("Created")
    table.add_column("Task")

    for task in tasks:
        style = "green" if task.status == "done" else "yellow"
        table.add_row(
            str(task.id),
            task.project_name,
            f"[{style}]{task.status}[/{style}]",
            task.created_at,
            task.title,
        )

    console.print(table)


def print_doctor_table(checks: list[HealthCheck]) -> None:
    table = Table(title="LW Doctor", show_header=True, header_style="bold cyan")
    table.add_column("Status")
    table.add_column("Check", style="bold")
    table.add_column("Detail")

    styles = {
        "ok": "green",
        "warn": "yellow",
        "fail": "red",
    }

    labels = {
        "ok": "OK",
        "warn": "WARN",
        "fail": "FAIL",
    }

    for check in checks:
        style = styles.get(check.status, "white")
        label = labels.get(check.status, check.status.upper())
        table.add_row(f"[{style}]{label}[/{style}]", check.name, check.detail)

    console.print(table)


def print_suggestions(suggestions: list[ProjectSuggestion]) -> None:
    for suggestion in suggestions:
        lines: list[str] = ["[bold]Observations[/bold]"]
        lines.extend(f"- {item}" for item in suggestion.observations)
        lines.append("")
        lines.append("[bold]Next Steps[/bold]")
        lines.extend(f"- {item}" for item in suggestion.next_steps)

        console.print(
            Panel.fit(
                "\n".join(lines),
                title=f"Suggestion: {suggestion.project_name}",
                border_style="cyan",
            )
        )


@project_app.command("add")
def project_add(
    name: str = typer.Argument(..., help="Display name for the project."),
    path: str = typer.Option(..., "--path", "-p", help="Local folder to track."),
    project_type: str = typer.Option("general", "--type", "-t", help="Project type."),
    status: str = typer.Option("active", "--status", "-s", help="Project status."),
    tags: str = typer.Option("", "--tags", help="Comma-separated project tags."),
) -> None:
    """Track a local project folder."""
    try:
        project = add_project(name, path, project_type, status, tags)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Added project:[/green] [bold]{project.name}[/bold]")
    print_project_details(project)


@project_app.command("list")
def project_list() -> None:
    """List tracked projects."""
    projects = list_projects()

    if not projects:
        console.print("[yellow]No projects tracked yet.[/yellow]")
        console.print("[dim]Try:[/dim] lw project add \"Luigi's World\" --path \"B:/LW\"")
        return

    print_project_table(projects)


@project_app.command("show")
def project_show(identifier: str = typer.Argument(..., help="Project name or ID.")) -> None:
    """Show details for one tracked project."""
    project = find_project(identifier)

    if project is None:
        console.print(f"[red]Project not found:[/red] {identifier}")
        raise typer.Exit(code=1)

    print_project_details(project)


@project_app.command("remove")
def project_remove(
    identifier: str = typer.Argument(..., help="Project name or ID."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Remove without confirmation."),
) -> None:
    """Stop tracking a project without deleting its files."""
    project = find_project(identifier)

    if project is None:
        console.print(f"[red]Project not found:[/red] {identifier}")
        raise typer.Exit(code=1)

    if not yes:
        confirmed = typer.confirm(f"Stop tracking {project.name}? Files will not be deleted.")

        if not confirmed:
            console.print("[yellow]Cancelled.[/yellow]")
            return

    try:
        removed = remove_project(identifier)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Stopped tracking:[/green] [bold]{removed.name}[/bold]")


@note_app.command("add")
def note_add(
    identifier: str = typer.Argument(..., help="Project name or ID."),
    body: str = typer.Argument(..., help="Note text."),
) -> None:
    """Add a note to a tracked project."""
    try:
        note = add_note(identifier, body)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Added note #{note.id}[/green] for [bold]{note.project_name}[/bold]")


@note_app.command("list")
def note_list(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
    limit: int = typer.Option(20, "--limit", "-n", min=1, max=100, help="Maximum notes to show."),
) -> None:
    """List recent notes."""
    try:
        notes = list_notes(identifier, limit)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    if not notes:
        console.print("[yellow]No notes found.[/yellow]")
        return

    print_notes_table(notes)


@task_app.command("add")
def task_add(
    identifier: str = typer.Argument(..., help="Project name or ID."),
    title: str = typer.Argument(..., help="Task text."),
) -> None:
    """Add a task to a tracked project."""
    try:
        task = add_task(identifier, title)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Added task #{task.id}[/green] for [bold]{task.project_name}[/bold]")


@task_app.command("list")
def task_list(
    identifier: str | None = typer.Argument(None, help="Optional project name or ID."),
    all_tasks: bool = typer.Option(False, "--all", "-a", help="Include completed tasks."),
) -> None:
    """List open tasks."""
    try:
        tasks = list_tasks(identifier, include_done=all_tasks)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    if not tasks:
        console.print("[yellow]No tasks found.[/yellow]")
        return

    print_tasks_table(tasks)


@task_app.command("done")
def task_done(task_id: int = typer.Argument(..., help="Task ID.")) -> None:
    """Mark a task as done."""
    try:
        task = complete_task(task_id)
    except ProjectRegistryError as error:
        console.print(f"[red]Error:[/red] {error}")
        raise typer.Exit(code=1) from error

    console.print(f"[green]Completed task #{task.id}:[/green] {task.title}")
