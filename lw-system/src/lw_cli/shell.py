from __future__ import annotations

import shlex
import subprocess
import sys
from os import system

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from lw_cli.status import get_workspace_status


console = Console()

ALIASES = {
    "c": "clear",
    "cls": "clear",
    "d": "doctor",
    "h": "help",
    "n": "note list",
    "p": "project list",
    "projects": "project list",
    "r": "report",
    "s": "status",
    "sg": "suggest",
    "t": "task list",
}


SHELL_HELP = """Commands inside the LW shell are the same as normal lw commands, without the lw prefix.

Examples:
  status
  suggest
  project list
  scan Lifesteal
  changes Lifesteal
  report Lifesteal
  note list Lifesteal
  task list Lifesteal

Aliases:
  s        -> status
  sg       -> suggest
  p        -> project list
  projects -> project list
  r        -> report
  d        -> doctor
  n        -> note list
  t        -> task list

Shell commands:
  aliases
  clear
  home
  help
  history
  exit
  quit
"""


def run_shell() -> None:
    history: list[str] = []
    print_home()

    while True:
        try:
            raw_command = input("lw:home> ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print()
            break

        if not raw_command:
            continue

        history.append(raw_command)
        expanded_command = expand_alias(raw_command)
        command = expanded_command.lower()

        if command in {"exit", "quit"}:
            break

        if command == "aliases":
            print_aliases()
            continue

        if command == "clear":
            clear_screen()
            continue

        if command == "help":
            console.print(SHELL_HELP)
            continue

        if command == "history":
            print_history(history)
            continue

        if command == "home":
            print_home()
            continue

        run_lw_command(expanded_command)


def print_home() -> None:
    status = get_workspace_status()
    summary = (
        "[bold]Luigi's World Shell[/bold]\n"
        "Project brain online.\n\n"
        f"[bold]Projects:[/bold] {status.project_count}   "
        f"[bold]Clean:[/bold] {status.clean_count}   "
        f"[bold]Changed:[/bold] {status.changed_count}   "
        f"[bold]Tasks:[/bold] {status.open_tasks}   "
        f"[bold]Notes:[/bold] {status.notes}\n\n"
        "[dim]Try:[/dim] status  |  suggest  |  projects  |  help"
    )

    console.print(Panel.fit(summary, title="lw shell", border_style="cyan"))


def clear_screen() -> None:
    system("cls" if sys.platform.startswith("win") else "clear")


def expand_alias(raw_command: str) -> str:
    parts = raw_command.split(maxsplit=1)

    if not parts:
        return raw_command

    alias = ALIASES.get(parts[0].lower())

    if alias is None:
        return raw_command

    if len(parts) == 1:
        return alias

    return f"{alias} {parts[1]}"


def print_aliases() -> None:
    table = Table(title="Aliases", show_header=True, header_style="bold cyan")
    table.add_column("Alias", style="bold")
    table.add_column("Command")

    for alias, command in sorted(ALIASES.items()):
        table.add_row(alias, command)

    console.print(table)


def print_history(history: list[str]) -> None:
    table = Table(title="Session History", show_header=True, header_style="bold cyan")
    table.add_column("#", justify="right")
    table.add_column("Command")

    for index, command in enumerate(history, start=1):
        table.add_row(str(index), command)

    console.print(table)


def run_lw_command(raw_command: str) -> None:
    try:
        args = shlex.split(raw_command)
    except ValueError as error:
        console.print(f"[red]Could not parse command:[/red] {error}")
        return

    if not args:
        return

    result = subprocess.run(
        [sys.executable, "-m", "lw_cli", *args],
        check=False,
    )

    if result.returncode != 0:
        console.print(f"[red]Command exited with code {result.returncode}[/red]")
