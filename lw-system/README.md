# Luigi's World CLI

Luigi's World CLI, shortened to `lw`, is a local-first desktop command system for managing projects, files, notes, reports, and future agent workflows from one personal workspace.

## Product Direction

Luigi's World has two planned layers:

- `lw` is the local command engine.
- Luigi's World Desktop is the future visual app shell.

The CLI should keep owning the project registry, scans, status reports, notes, tasks, and command behavior. The desktop app should become the designed window for using that system without living inside PowerShell.

## First Slice

The first build establishes the CLI foundation:

```txt
lw about
lw version
lw doctor
lw config path
lw config show
lw config set
lw project add
lw project list
lw project show
lw scan
lw status
lw suggest
lw changes
lw report
lw shell
lw note add
lw note list
lw task add
lw task list
lw task done
```

## Development Setup

Create and install the local CLI package:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
```

Run commands through the local environment:

```powershell
.\.venv\Scripts\lw.exe about
.\.venv\Scripts\lw.exe config show
```

Open the interactive shell:

```powershell
.\.venv\Scripts\lw.exe shell
```

Inside the shell, run commands without the `lw` prefix:

```txt
status
suggest
scan Lifesteal
report Lifesteal
projects
s
sg Lifesteal
aliases
home
exit
```

Run a local health check:

```powershell
.\.venv\Scripts\lw.exe doctor
```

## Desktop Install

Install `lw` as a user-level desktop command:

```powershell
.\scripts\install-desktop.ps1
```

This creates launchers in:

```txt
C:\Users\louis\.local\bin
```

After that, `lw` can be run from any terminal:

```powershell
lw doctor
lw status
lw shell
```

The installer also creates a desktop shortcut named `Luigi's World Shell` that opens the interactive shell directly.

This is a bridge step, not the final form. The final desktop direction is a custom app window with a designed home screen, command bar, project panels, and future mini-app views.

## Desktop App Baseline

The next product baseline is:

1. Keep the CLI as the core brain.
2. Add a desktop app shell.
3. Connect the app shell to existing `lw` commands or shared Python APIs.
4. Build the first real app screen with project status, command input, notes, tasks, and quick actions.
5. Add richer special views later, such as `stocks`, `btc`, stream tools, project pages, and agent summaries.

The first desktop shell lives at:

```txt
B:\LW\lw-desktop
```

Run it in development mode:

```powershell
cd B:\LW\lw-desktop
npm run app
```

Build and open the app window without a visible PowerShell terminal:

```powershell
cd B:\LW\lw-desktop
npm run build
.\scripts\install-shortcut.ps1
```

Update local configuration:

```powershell
.\.venv\Scripts\lw.exe config show
.\.venv\Scripts\lw.exe config set reports_dir "D:/LW Reports"
```

## Project Registry

Track a local folder:

```powershell
.\.venv\Scripts\lw.exe project add "Lifesteal" --path "B:/LS" --type workspace
```

List and inspect tracked projects:

```powershell
.\.venv\Scripts\lw.exe project list
.\.venv\Scripts\lw.exe project show "Lifesteal"
```

Scan tracked project files:

```powershell
.\.venv\Scripts\lw.exe scan
.\.venv\Scripts\lw.exe scan "Lifesteal"
```

Show the latest known workspace status:

```powershell
.\.venv\Scripts\lw.exe status
```

Suggest practical next steps:

```powershell
.\.venv\Scripts\lw.exe suggest
.\.venv\Scripts\lw.exe suggest "Lifesteal"
```

Show file-level changes from the latest scan:

```powershell
.\.venv\Scripts\lw.exe changes
.\.venv\Scripts\lw.exe changes "Lifesteal"
```

Generate a Markdown report:

```powershell
.\.venv\Scripts\lw.exe report
.\.venv\Scripts\lw.exe report "Lifesteal"
```

Capture project notes:

```powershell
.\.venv\Scripts\lw.exe note add "Lifesteal" "Need to review the next release flow."
.\.venv\Scripts\lw.exe note list "Lifesteal"
```

Track project tasks:

```powershell
.\.venv\Scripts\lw.exe task add "Lifesteal" "Review open release tasks"
.\.venv\Scripts\lw.exe task list "Lifesteal"
.\.venv\Scripts\lw.exe task done 1
```

Stop tracking a project without deleting files:

```powershell
.\.venv\Scripts\lw.exe project remove "Lifesteal"
```
