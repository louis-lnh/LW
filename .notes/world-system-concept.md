# World System Concept

## Overview

The World System is a local-first desktop command system for managing projects, files, notes, websites, and future automation agents from one central place.

The main idea is to create a personal software environment that works like a custom command-line operating layer. Instead of opening many separate tools, folders, dashboards, and websites, the user can manage their work through one focused desktop CLI or terminal-style app.

The system should feel like a project command center: fast, direct, personal, and expandable. It begins as a desktop CLI, but the long-term vision can include a desktop app, cloud sync, mobile access, website publishing, and specialized agent modules.

At its core, the World System is not only a file manager and not only a website backend. It is a local workspace brain that knows what projects exist, where their files live, what changed recently, what still needs work, and what can be published or synced.

## Core Purpose

The system should help the user control their digital projects with less friction.

It should:

- Track local projects and important folders.
- Organize files, notes, assets, and project metadata.
- Provide quick CLI commands for project management.
- Keep a local index of changes and project state.
- Give useful status reports about what is new, unfinished, outdated, or ready.
- Support offline-first usage.
- Allow cloud sync later so files and projects can be accessed across devices.
- Act as a backend for public websites or project pages when publishing features are added.
- Support future AI or automation agents that watch projects and explain what needs attention.

The first identity of the product is a desktop CLI. A visual desktop app, web dashboard, and mobile app can exist later as extra surfaces over the same core system.

## Product Identity

The system should feel like a custom command layer for the user's creative and technical work.

It is similar in spirit to:

- A file cloud, because it manages and syncs files.
- GitHub, because it tracks project state and can support versioned work.
- A local project manager, because it understands active projects and tasks.
- A command center, because it gives status, reports, and actions from one place.
- A personal agent, because it can eventually explain what changed and what should happen next.

However, it should not become a generic clone of any one of those products. The strongest version is a simple local-first system with a distinct CLI personality and practical automation.

## Local-First Design

The system should work locally before it depends on a server.

Local-first means:

- The user can manage projects while offline.
- Files remain available on the machine.
- Project metadata is stored locally.
- Changes can be queued for later sync.
- Cloud features enhance the system but do not replace the local workspace.

This matters because the system is meant to feel reliable and personal. The user should not lose access to their project brain just because there is no internet connection.

## CLI-First Interface

The first major interface should be a desktop CLI.

The CLI should use clear custom commands rather than raw system commands. The goal is not to expose the full operating system shell. The goal is to create a focused command language for managing projects.

Example command categories:

```txt
world init
world project add
world project list
world open
world scan
world status
world report
world note
world task
world sync
world publish
world ask
```

The CLI should be readable and friendly. It should use polished terminal output, clear tables, useful summaries, and direct next actions.

The CLI is also the foundation for future interfaces. A desktop app or mobile app should eventually call into the same underlying system rather than becoming a separate product.

## Project Management

Projects are the main objects in the system.

A project can represent:

- A website.
- A software repo.
- A creative folder.
- A video or streaming workflow.
- A brand asset collection.
- A notes folder.
- Any important workspace the user wants to track.

Each project should have metadata such as:

- Name.
- Local path.
- Type.
- Status.
- Tags.
- Last scanned time.
- Last modified time.
- Important files.
- Notes.
- Tasks.
- Sync state.
- Publish state.

The system should be able to scan project folders and detect meaningful changes, such as new files, edited notes, deleted assets, large additions, missing files, or publishable updates.

## File Cloud Vision

The long-term vision includes cloud access similar to a personal GitHub or file cloud, but designed around project work instead of only code repositories.

The cloud layer could eventually support:

- Syncing project files across devices.
- Remote access to project folders.
- Offline changes that sync later.
- Mobile viewing and light editing.
- Version history.
- File restoration.
- Project sharing.
- Website publishing.
- Agent reports that stay available across devices.

The system should treat sync as a layer over the local project store. Local data should remain useful without cloud access.

## Website Backend Potential

The system can later act as the backend for websites.

For example, a project could contain website content, notes, images, updates, and metadata. When the user publishes, the website reads from that project data or from a generated published output.

This would let a website stay up to date from the same system used to manage the project.

Possible website-related features:

- Project pages.
- Public update feeds.
- Changelogs.
- Asset galleries.
- Markdown or MDX content.
- Static site generation.
- Live backend API.
- Publish status.
- Draft and live states.

The website is not the starting point anymore. It becomes one possible output of the World System.

## Agent Layer

The system should eventually include an agent-like assistant that understands project state and gives useful feedback.

The agent should not start as a vague chatbot. It should begin as a practical project assistant that reads real local data and produces useful summaries.

The agent should be able to answer questions such as:

- What changed today?
- Which projects need attention?
- What files were added recently?
- Which project looks ready to publish?
- What tasks are still open?
- What looks unfinished?
- What has not been synced yet?
- What should I work on next?

The first version can be rule-based. It can inspect project metadata, file changes, notes, and tasks. AI can be added later to summarize, rank, explain, and suggest.

The tone should feel like a focused assistant for the software, not a general-purpose AI personality. The assistant should be helpful, specific, and grounded in the user's actual files.

## Example Agent Output

```txt
World Status

3 projects changed today.

Luigi's World
- 1 new concept note added
- Website publishing is not configured yet
- Suggested next step: define project metadata

PostStream Agent
- Product idea note exists outside the workspace
- Strong candidate for a future module
- Suggested next step: keep it separate until the World core is stable

SHD Assets
- 14 files added locally
- Sync is not configured
- Suggested next step: review and tag new assets
```

## PostStream Agent Relationship

PostStream Agent is a separate idea that fits naturally into the World System later.

PostStream Agent is a local offline automation assistant for streamers and creators. It watches recording folders, processes OBS recordings, detects candidate highlights, generates clips, creates reports, and can eventually integrate with transcription, local AI, and DaVinci Resolve.

Inside the World System, PostStream could become a specialized module or plugin.

Example:

```txt
world poststream process "D:/OBS/Recordings/stream.mkv"
world poststream watch
world poststream report latest
```

The core pattern is valuable:

```txt
Event happens
System detects it
Files are processed
Output is organized
Report is generated
Agent explains what changed
```

That pattern can apply to many future workflows, not just streaming.

## Possible System Layers

The system can be thought of as several layers.

### Core Engine

The core engine manages projects, files, local metadata, scanning, reports, tasks, and system state.

### CLI Interface

The CLI is the first user-facing surface. It allows the user to control the system quickly through commands.

### Local Database

A local database stores project metadata, scan history, tasks, notes, sync state, and reports. SQLite is a strong fit for this role.

### File Indexer

The file indexer scans project folders and records changes. It should understand new files, modified files, deleted files, file sizes, timestamps, and important project markers.

### Agent System

The agent system reads project state and generates summaries, warnings, suggestions, and reports.

### Sync Layer

The sync layer eventually connects the local system to cloud storage or a custom backend. It should support offline queues and conflict handling.

### Publishing Layer

The publishing layer turns selected project data into websites, public pages, feeds, or other shareable outputs.

### Plugin or Module Layer

Specialized workflows such as PostStream Agent can be added as modules without making the core system too large.

## Technical Direction

A practical first technical direction would be:

- Python for the CLI and local automation.
- Typer for command structure.
- Rich for polished terminal output.
- SQLite for local metadata.
- Project folders as the source of actual files.
- Watchdog or scan commands for detecting file changes.
- Optional local AI through Ollama, llama.cpp, LM Studio, or similar tools later.
- Optional desktop app later through Tauri, Electron, or a terminal UI framework.

This stack fits the file automation and agent direction well. It also leaves room for future cloud and desktop interfaces.

## Design Principles

The system should stay useful, personal, and grounded.

Important principles:

- Start local.
- Keep commands clear.
- Prefer useful reports over flashy AI.
- Treat AI as an assistant layer, not the whole product.
- Keep project files accessible outside the app.
- Avoid locking the user into one interface.
- Make sync optional at first.
- Make every feature earn its place.
- Support offline work.
- Let specialized modules grow from real workflows.

## One-Line Pitch

World System is a local-first desktop command center for managing projects, files, notes, publishing, sync, and future agent workflows from one personal CLI-driven workspace.
