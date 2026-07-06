# World System Roadmap

## Roadmap Goal

This roadmap covers the first serious build phase of the World System: turning the idea into a useful local desktop CLI, then growing that CLI into a real desktop app surface.

The goal is not to build the full dream version immediately. The goal is to create a solid local foundation that already helps manage real projects and can later grow into a designed desktop app, sync, publishing, mobile access, and agent modules.

## Current Baseline

The first baseline has two layers:

- `lw` as the local command engine.
- Luigi's World Desktop as the future visual app shell.

The CLI is the brain. It owns project tracking, scans, status reports, notes, tasks, and command behavior. The desktop app should become the designed window for using that brain without living inside PowerShell.

## Phase 1: CLI Foundation

### Purpose

Create the first working command-line app and establish the basic structure of the system.

### Core Outcome

The user can run a `world` command from the terminal and get useful system responses.

### Features

- Create the project structure.
- Add the CLI entry point.
- Add basic command routing.
- Add app configuration.
- Add local data folder setup.
- Add clean terminal output.
- Add basic help/about/version commands.

### Example Commands

```txt
world
world about
world version
world config show
world config path
```

### Done When

The CLI runs reliably, has a clean structure, and is ready for real project commands.

## Phase 2: Local Project Registry

### Purpose

Allow the system to know which projects exist and where they live.

### Core Outcome

The user can add, list, inspect, and remove tracked projects.

### Features

- Add a local SQLite database.
- Store project name, path, type, status, tags, and timestamps.
- Register existing local folders as projects.
- List all tracked projects.
- Show details for one project.
- Remove a project from tracking without deleting its files.

### Example Commands

```txt
world project add "Luigi's World" --path "B:/Luigi's World"
world project list
world project show "Luigi's World"
world project remove "Luigi's World"
```

### Done When

The system can remember projects between runs and treat them as first-class objects.

## Phase 3: File Scanning

### Purpose

Make the system aware of what is inside each project.

### Core Outcome

The user can scan projects and see file changes.

### Features

- Scan project folders.
- Store file paths, sizes, modified times, and hashes if useful.
- Detect new files.
- Detect modified files.
- Detect deleted or missing files.
- Ignore common unwanted folders such as `node_modules`, `.git`, build output, caches, and temporary files.
- Record scan history.

### Example Commands

```txt
world scan
world scan "Luigi's World"
world changes
world changes "Luigi's World"
```

### Done When

The system can tell what changed in tracked projects since the last scan.

## Phase 4: Status Reports

### Purpose

Turn raw project and file data into something useful to read.

### Core Outcome

The user can ask the system for a summary of their workspace.

### Features

- Show recent project activity.
- Show changed projects.
- Show unsynced or unpublished states as placeholders.
- Show projects that have not been scanned recently.
- Show missing or deleted files.
- Generate simple Markdown reports.
- Save reports locally.

### Example Commands

```txt
world status
world report
world report "Luigi's World"
```

### Done When

The CLI can answer the basic question: "What is going on in my projects?"

## Phase 5: Notes And Tasks

### Purpose

Let the system track lightweight project context, not just files.

### Core Outcome

The user can attach notes and tasks to projects from the CLI.

### Features

- Add project notes.
- List notes.
- Add tasks.
- Mark tasks as done.
- Show open tasks in project status.
- Include notes and tasks in reports.

### Example Commands

```txt
world note add "Luigi's World" "Need to define first CLI commands"
world note list "Luigi's World"
world task add "Luigi's World" "Build project registry"
world task done 1
world task list
```

### Done When

The system starts feeling like a project command center, not only a file scanner.

## Phase 6: First Agent Summary

### Purpose

Add the first version of the assistant layer without depending on complex AI.

### Core Outcome

The system gives useful suggestions based on real project state.

### Features

- Summarize what changed recently.
- Point out projects with open tasks.
- Point out projects with many new files.
- Point out projects that need a scan.
- Suggest simple next actions.
- Generate a daily or session report.

### Example Commands

```txt
world agent summary
world agent suggest
world agent today
```

### Done When

The system can explain project state in plain language and suggest practical next steps.

## Phase 7: Prepare For Expansion

### Purpose

Make the foundation clean enough for future sync, publishing, desktop app UI, and modules.

### Core Outcome

The local CLI core is stable and organized.

### Features

- Clean internal module boundaries.
- Clear database migrations.
- Export/import local metadata.
- Project config files if needed.
- Plugin/module structure design.
- Basic test coverage for core commands.
- Documentation for command usage.

### Example Commands

```txt
world export
world import
world doctor
```

### Done When

The first local version is useful on its own and ready for bigger features.

## Phase 8: Desktop App Baseline

### Purpose

Turn Luigi's World from a terminal-only tool into a real Windows desktop app with its own designed window, while keeping the CLI as the core engine.

### Core Outcome

The user can open Luigi's World like a normal desktop app and use a visual home dashboard plus a command bar to run the same workflows that already exist in `lw`.

### Baseline Direction

1. Keep the CLI as the core brain.
2. Add a desktop app shell, preferably lightweight and local-first.
3. Let the desktop app call existing `lw` commands or shared Python APIs.
4. Build the first real app screen: a home dashboard with project status, command input, notes, tasks, and quick actions.
5. Add richer special views later, such as `stocks`, `btc`, stream tools, project pages, and agent summaries.

### Features

- Create a dedicated desktop app folder in the LW workspace.
- Choose the first app shell technology.
- Add a custom app window that does not depend on a visible PowerShell terminal.
- Add a command bar for Luigi's World commands.
- Add a home dashboard backed by current `lw status` and project data.
- Add navigation slots for future mini-apps.
- Keep all local data and project indexing owned by the existing LW core.

### Example App Commands

```txt
home
status
projects
scan Lifesteal
suggest Lifesteal
btc
stocks
```

### Done When

Luigi's World can be launched as a normal desktop app, shows a designed home dashboard, and can run at least the existing status/project commands without opening a terminal window.

### First Baseline Status

Started on 2026-07-06.

- Added `B:\LW\lw-desktop` as an Electron desktop shell.
- Added `lw app snapshot` for machine-readable desktop data.
- Built a home dashboard with command input, project metrics, notes, tasks, and command output.
- Added a desktop shortcut named `Luigi's World Desktop`.
- Verified the built app loads from `file://`, reads live Lifesteal data, and runs the `projects` alias through the command bar.

## First Build Focus

The first build should stay focused on these commands:

```txt
world about
world config show
world project add
world project list
world project show
world scan
world status
world report
```

These commands create the smallest useful version of the World System.

## Not In The First Build

The following ideas are important but should wait until the local CLI core is useful:

- Cloud sync.
- Mobile app.
- Public website backend.
- PostStream integration.
- Local AI models.
- File sharing.
- User accounts.
- Full desktop GUI beyond the first desktop app baseline.
- Real-time background daemon.

## First Milestone

The first milestone is simple:

```txt
Track one real project.
Scan its files.
Show what changed.
Generate a readable status report.
```

If the system can do that well, the foundation is real.
