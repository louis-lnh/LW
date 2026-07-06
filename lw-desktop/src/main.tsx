import React from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  Command,
  FileText,
  FolderPlus,
  FolderKanban,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import "./styles.css";

const commandHints = ["status", "projects", "suggest Lifesteal", "btc", "btc status", "btc refresh", "btc report"];
const marketRanges: MarketRange[] = ["1H", "24H", "7D", "30D"];
type AppView = "home" | "projects" | "btc" | "reports" | "agent";

const viewTitles: Record<AppView, string> = {
  home: "Home",
  projects: "Projects",
  btc: "BTC",
  reports: "Reports",
  agent: "Agent",
};

function App() {
  const [snapshot, setSnapshot] = React.useState<DesktopSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [command, setCommand] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [output, setOutput] = React.useState("Ready. Try status, projects, or suggest Lifesteal.");
  const [error, setError] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<AppView>("home");
  const [addProjectDraft, setAddProjectDraft] = React.useState<AddProjectInput | null>(null);
  const [addingProject, setAddingProject] = React.useState(false);
  const [reports, setReports] = React.useState<ReportFile[]>([]);
  const [selectedReportPath, setSelectedReportPath] = React.useState<string | null>(null);
  const [selectedReportContent, setSelectedReportContent] = React.useState("");
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [market, setMarket] = React.useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = React.useState(false);
  const [marketRange, setMarketRange] = React.useState<MarketRange>("7D");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setSnapshot(await window.lw.getSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Luigi's World.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshMarket = React.useCallback(async (options?: { force?: boolean; range?: MarketRange }) => {
    setMarketLoading(true);

    try {
      setMarket(await window.lw.getMarketSnapshot({ ...options, range: options?.range ?? marketRange }));
    } catch (err) {
      setMarket({
        mode: "Preview",
        range: options?.range ?? marketRange,
        lastUpdated: new Date().toISOString(),
        assets: [],
        error: err instanceof Error ? err.message : "Could not load market data.",
      });
    } finally {
      setMarketLoading(false);
    }
  }, [marketRange]);

  React.useEffect(() => {
    if (activeView === "btc" && market === null) {
      refreshMarket();
    }
  }, [activeView, market, refreshMarket]);

  const refreshReports = React.useCallback(async () => {
    setReportsLoading(true);

    try {
      const nextReports = await window.lw.listReports();
      setReports(nextReports);

      const nextSelectedPath = selectedReportPath && nextReports.some((report) => report.path === selectedReportPath)
        ? selectedReportPath
        : nextReports[0]?.path ?? null;

      setSelectedReportPath(nextSelectedPath);

      if (nextSelectedPath) {
        setSelectedReportContent(await window.lw.readReport(nextSelectedPath));
      } else {
        setSelectedReportContent("");
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Could not load reports.");
    } finally {
      setReportsLoading(false);
    }
  }, [selectedReportPath]);

  React.useEffect(() => {
    if (activeView === "reports" && reports.length === 0) {
      refreshReports();
    }
  }, [activeView, reports.length, refreshReports]);

  async function executeCommand(nextCommand: string) {
    if (!nextCommand) {
      return;
    }

    const marketCommand = getMarketCommand(nextCommand);

    if (marketCommand) {
      setActiveView("btc");
      setCommand("");
      await runMarketCommand(marketCommand, nextCommand);
      return;
    }

    const routedView = getCommandView(nextCommand);

    if (routedView) {
      setActiveView(routedView);
      setOutput(`Opened ${viewTitles[routedView]}.`);
      setCommand("");

      if (routedView === "home") {
        await refresh();
      }

      if (routedView === "btc") {
        await refreshMarket();
      }

      return;
    }

    setRunning(true);
    setOutput(`lw ${nextCommand}`);

    try {
      const result = await window.lw.runCommand(nextCommand);
      setOutput([result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "Done.");

      if (nextCommand === "home" || nextCommand === "status" || nextCommand.startsWith("scan")) {
        await refresh();
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Command failed.");
    } finally {
      setRunning(false);
      setCommand("");
    }
  }

  async function runCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await executeCommand(command.trim());
  }

  const status = snapshot?.status;
  const projects = status?.projects ?? [];
  const pageTitle = viewTitles[activeView];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">LW</div>
        <nav className="rail" aria-label="Primary">
          <button className={`rail-button ${activeView === "home" ? "active" : ""}`} onClick={() => openView("home")} title="Home" aria-label="Home">
            <Command size={20} />
          </button>
          <button className={`rail-button ${activeView === "projects" ? "active" : ""}`} onClick={() => openView("projects")} title="Projects" aria-label="Projects">
            <FolderKanban size={20} />
          </button>
          <button className={`rail-button ${activeView === "btc" ? "active" : ""}`} onClick={() => openView("btc")} title="BTC" aria-label="BTC">
            <BadgeDollarSign size={20} />
          </button>
          <button className={`rail-button ${activeView === "reports" ? "active" : ""}`} onClick={() => openView("reports")} title="Reports" aria-label="Reports">
            <FileText size={20} />
          </button>
          <button className={`rail-button ${activeView === "agent" ? "active" : ""}`} onClick={() => openView("agent")} title="Agent" aria-label="Agent">
            <Sparkles size={20} />
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Luigi's World Desktop</p>
            <h1>{pageTitle}</h1>
          </div>
          <button className="icon-button" onClick={refresh} title="Refresh" aria-label="Refresh">
            {loading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          </button>
        </header>

        <form className="command-bar" onSubmit={runCommand}>
          <Search size={18} />
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Run a command..."
            aria-label="Run a command"
          />
          <button type="submit" disabled={running} title="Run" aria-label="Run command">
            {running ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
          </button>
        </form>

        <div className="hint-row">
          {commandHints.map((hint) => (
            <button key={hint} type="button" onClick={() => executeCommand(hint)} disabled={running}>
              {hint}
            </button>
          ))}
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeView === "home" ? <HomeView projects={projects} snapshot={snapshot} status={status} /> : null}
        {activeView === "projects" ? <ProjectsView onAddProject={startAddProject} projects={projects} /> : null}
        {activeView === "btc" ? (
          <BtcView
            loading={marketLoading}
            market={market}
            onRangeChange={changeMarketRange}
            onRefresh={refreshMarket}
            range={marketRange}
          />
        ) : null}
        {activeView === "reports" ? (
          <ReportsView
            loading={reportsLoading}
            onGenerate={generateReport}
            onRefresh={refreshReports}
            onSelect={selectReport}
            projects={projects}
            reports={reports}
            selectedContent={selectedReportContent}
            selectedPath={selectedReportPath}
          />
        ) : null}
        {activeView === "agent" ? <PlaceholderView title="Agent" body="Agent summaries will live here once suggestions grow into a fuller assistant view." /> : null}

        <section className="panel terminal-panel">
          <div className="panel-header">
            <h2>Command Output</h2>
            <Terminal size={18} />
          </div>
          <pre>{output}</pre>
        </section>

        {addProjectDraft ? (
          <AddProjectModal
            adding={addingProject}
            draft={addProjectDraft}
            onCancel={() => setAddProjectDraft(null)}
            onChange={setAddProjectDraft}
            onConfirm={confirmAddProject}
          />
        ) : null}
      </section>
    </main>
  );

  function openView(view: AppView) {
    setActiveView(view);
    setOutput(`Opened ${viewTitles[view]}.`);

    if (view === "btc") {
      refreshMarket();
    }

    if (view === "reports") {
      refreshReports();
    }
  }

  async function runMarketCommand(marketCommand: MarketCommand, rawCommand: string) {
    setRunning(true);

    try {
      const currentMarket = marketCommand.kind === "refresh" || market === null ? await window.lw.getMarketSnapshot({ force: marketCommand.kind === "refresh", range: marketRange }) : market;
      setMarket(currentMarket);
      setOutput(formatMarketCommandOutput(marketCommand, rawCommand, currentMarket));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Market command failed.");
    } finally {
      setRunning(false);
    }
  }

  async function changeMarketRange(range: MarketRange) {
    setMarketRange(range);
    await refreshMarket({ range });
  }

  async function startAddProject() {
    const folderPath = await window.lw.selectProjectFolder();

    if (!folderPath) {
      return;
    }

    setAddProjectDraft({
      name: folderPath.split(/[\\/]/).filter(Boolean).at(-1) ?? "New Project",
      path: folderPath,
      type: "workspace",
      notes: "",
      tasks: "",
    });
  }

  async function confirmAddProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!addProjectDraft || addingProject) {
      return;
    }

    setAddingProject(true);
    setOutput(`Adding project ${addProjectDraft.name}...`);

    try {
      const result = await window.lw.addProject(addProjectDraft);
      setOutput([result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "Project added.");

      if (result.ok) {
        setAddProjectDraft(null);
        await refresh();
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Could not add project.");
    } finally {
      setAddingProject(false);
    }
  }

  async function selectReport(reportPath: string) {
    setSelectedReportPath(reportPath);
    setReportsLoading(true);

    try {
      setSelectedReportContent(await window.lw.readReport(reportPath));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Could not read report.");
    } finally {
      setReportsLoading(false);
    }
  }

  async function generateReport(identifier?: string) {
    setReportsLoading(true);
    setOutput(identifier ? `Generating report for ${identifier}...` : "Generating workspace report...");

    try {
      const result = await window.lw.generateReport(identifier);
      setReports(result.reports);
      setOutput([result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "Report generated.");

      const newest = result.reports[0];

      if (newest) {
        setSelectedReportPath(newest.path);
        setSelectedReportContent(await window.lw.readReport(newest.path));
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Could not generate report.");
    } finally {
      setReportsLoading(false);
    }
  }
}

type MarketCommand =
  | { kind: "status" }
  | { kind: "refresh" }
  | { kind: "report" }
  | { kind: "alert"; value: string | null };

function getMarketCommand(command: string): MarketCommand | null {
  const normalized = command.trim().replace(/^lw\s+/i, "").toLowerCase();

  if (normalized === "btc status" || normalized === "bitcoin status") {
    return { kind: "status" };
  }

  if (normalized === "btc refresh" || normalized === "bitcoin refresh") {
    return { kind: "refresh" };
  }

  if (normalized === "btc report" || normalized === "bitcoin report") {
    return { kind: "report" };
  }

  if (normalized.startsWith("btc alert set") || normalized.startsWith("bitcoin alert set")) {
    const value = command.trim().split(/\s+/).slice(3).join(" ").trim() || null;
    return { kind: "alert", value };
  }

  return null;
}

function formatMarketCommandOutput(command: MarketCommand, rawCommand: string, market: MarketSnapshot) {
  const btc = market.assets.find((asset) => asset.symbol === "BTC");

  if (!btc) {
    return "BTC market data is not available yet.";
  }

  if (command.kind === "refresh") {
    return `BTC refreshed.\nPrice: ${formatCurrency(btc.price)}\n24h Change: ${formatPercent(btc.change24h)}\nVolume: ${formatCompactCurrency(btc.volume24h)}\nMode: ${market.mode}\nLast updated: ${formatDateTime(btc.lastUpdated)}`;
  }

  if (command.kind === "report") {
    return `Market Report\n\nBTC is at ${formatCurrency(btc.price)}.\n24h change is ${formatPercent(btc.change24h)}.\nVolume is ${formatCompactCurrency(btc.volume24h)}.\nSignal is ${btc.signal}.\nMode is ${market.mode}.\nLast updated: ${formatDateTime(btc.lastUpdated)}.\n\nThis is informational market context, not financial advice.`;
  }

  if (command.kind === "alert") {
    return `Alert draft created from: ${rawCommand}\n\nAlert persistence is not wired yet. Next step is storing watched zones locally and checking them on refresh.`;
  }

  return `BTC Status\nPrice: ${formatCurrency(btc.price)}\n24h Change: ${formatPercent(btc.change24h)}\nVolume: ${formatCompactCurrency(btc.volume24h)}\nSignal: ${btc.signal}\nMode: ${market.mode}\nLast updated: ${formatDateTime(btc.lastUpdated)}`;
}

function getCommandView(command: string): AppView | null {
  const normalized = command.trim().replace(/^lw\s+/i, "").toLowerCase();

  if (normalized === "home") {
    return "home";
  }

  if (normalized === "projects" || normalized === "project" || normalized === "project list") {
    return "projects";
  }

  if (normalized === "btc" || normalized === "bitcoin" || normalized === "stocks btc") {
    return "btc";
  }

  return null;
}

function HomeView({
  projects,
  snapshot,
  status,
}: {
  projects: ProjectSnapshot[];
  snapshot: DesktopSnapshot | null;
  status: DesktopSnapshot["status"] | undefined;
}) {
  return (
    <>
      <section className="metrics" aria-label="Workspace metrics">
        <Metric icon={<FolderKanban size={18} />} label="Projects" value={status?.project_count ?? 0} />
        <Metric icon={<Activity size={18} />} label="Tracked Files" value={status?.tracked_files ?? 0} />
        <Metric icon={<ClipboardList size={18} />} label="Open Tasks" value={status?.open_tasks ?? 0} />
        <Metric icon={<CheckCircle2 size={18} />} label="Clean" value={status?.clean_count ?? 0} />
      </section>

      <section className="content-grid">
        <ProjectPanel projects={projects} compact />
        <ContextPanel snapshot={snapshot} />
      </section>
    </>
  );
}

function ProjectsView({ onAddProject, projects }: { onAddProject: () => void; projects: ProjectSnapshot[] }) {
  return (
    <section className="panel page-panel">
      <div className="panel-header">
        <h2>Tracked Projects</h2>
        <div className="panel-actions">
          <span>{projects.length}</span>
          <button className="text-action" onClick={onAddProject} type="button">
            <FolderPlus size={16} />
            Add Project
          </button>
        </div>
      </div>
      <div className="project-list expanded">
        {projects.map((project) => (
          <article className="project-row expanded" key={project.id}>
            <div>
              <div className="project-title">
                <span className={`state-dot ${project.state}`} />
                <strong>{project.name}</strong>
              </div>
              <p>{project.path}</p>
            </div>
            <div className="project-stats">
              <span>{project.type}</span>
              <span>{project.status}</span>
              <span>{project.tracked_files} files</span>
              <span>{project.last_changes.new} new</span>
              <span>{project.last_changes.modified} modified</span>
              <span>{project.last_changes.deleted} deleted</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AddProjectModal({
  adding,
  draft,
  onCancel,
  onChange,
  onConfirm,
}: {
  adding: boolean;
  draft: AddProjectInput;
  onCancel: () => void;
  onChange: (draft: AddProjectInput) => void;
  onConfirm: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onConfirm}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Project Registry</p>
            <h2>Add Project</h2>
          </div>
          <button className="modal-close" onClick={onCancel} type="button" aria-label="Close">
            x
          </button>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            required
          />
        </label>

        <label className="field">
          <span>Folder</span>
          <input value={draft.path} readOnly />
        </label>

        <label className="field">
          <span>Type</span>
          <select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value })}>
            <option value="workspace">workspace</option>
            <option value="website">website</option>
            <option value="creative">creative</option>
            <option value="general">general</option>
          </select>
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            placeholder="Optional. One note per line."
            value={draft.notes}
            onChange={(event) => onChange({ ...draft, notes: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Tasks</span>
          <textarea
            placeholder="Optional. One task per line."
            value={draft.tasks}
            onChange={(event) => onChange({ ...draft, tasks: event.target.value })}
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-action" disabled={adding} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary-action" disabled={adding} type="submit">
            {adding ? "Adding..." : "Confirm Addition"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportsView({
  loading,
  onGenerate,
  onRefresh,
  onSelect,
  projects,
  reports,
  selectedContent,
  selectedPath,
}: {
  loading: boolean;
  onGenerate: (identifier?: string) => void;
  onRefresh: () => void;
  onSelect: (reportPath: string) => void;
  projects: ProjectSnapshot[];
  reports: ReportFile[];
  selectedContent: string;
  selectedPath: string | null;
}) {
  return (
    <section className="reports-layout">
      <section className="panel report-list-panel">
        <div className="panel-header">
          <h2>Reports</h2>
          <div className="panel-actions">
            <span>{reports.length}</span>
            <button className="secondary-action" disabled={loading} onClick={onRefresh} type="button">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="report-actions">
          <button className="primary-action" disabled={loading} onClick={() => onGenerate()} type="button">
            Generate Workspace
          </button>
          {projects.map((project) => (
            <button className="secondary-action" disabled={loading} key={project.id} onClick={() => onGenerate(project.name)} type="button">
              {project.name}
            </button>
          ))}
        </div>

        <div className="report-list">
          {reports.map((report) => (
            <button
              className={`report-item ${report.path === selectedPath ? "active" : ""}`}
              key={report.path}
              onClick={() => onSelect(report.path)}
              type="button"
            >
              <strong>{report.name}</strong>
              <span>{formatDateTime(report.updatedAt)} · {formatBytes(report.size)}</span>
            </button>
          ))}
          {reports.length === 0 ? <p className="empty">No reports generated yet.</p> : null}
        </div>
      </section>

      <section className="panel report-preview-panel">
        <div className="panel-header">
          <h2>Preview</h2>
          <span>{loading ? "Loading" : selectedPath ? "Markdown" : "-"}</span>
        </div>
        <pre className="report-preview">{selectedContent || "Select or generate a report."}</pre>
      </section>
    </section>
  );
}

function BtcView({
  loading,
  market,
  onRangeChange,
  onRefresh,
  range,
}: {
  loading: boolean;
  market: MarketSnapshot | null;
  onRangeChange: (range: MarketRange) => void;
  onRefresh: (options?: { force?: boolean; range?: MarketRange }) => void;
  range: MarketRange;
}) {
  const assets = market?.assets ?? [];
  const selectedAsset = assets.find((asset) => asset.symbol === "BTC") ?? assets[0];
  const chart = getSparklineChart(selectedAsset?.sparkline ?? []);

  return (
    <section className="btc-layout">
      <section className="panel btc-hero">
        <div>
          <p className="eyebrow">Market Module</p>
          <h2>{selectedAsset?.symbol ?? "BTC"}</h2>
          <p className="btc-subtitle">Tracked market watch with live BTC data first. Alerts, zones, reports, and more watched assets can grow from this screen.</p>
        </div>
        <div className="btc-actions">
          <button className="market-refresh" type="button" onClick={() => onRefresh({ force: true, range })} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <div className="btc-price">
            <span>Mode</span>
            <strong>{market?.mode ?? "Preview"}</strong>
          </div>
        </div>
      </section>

      {market?.error ? <div className="error-banner">Market data fallback: {market.error}</div> : null}

      <section className="watchlist" aria-label="Tracked market assets">
        {assets.map((asset) => (
          <article className={`watch-card ${asset.symbol === selectedAsset?.symbol ? "active" : ""}`} key={asset.id}>
            <span>{asset.name}</span>
            <strong>{asset.symbol}</strong>
            <p>{formatCurrency(asset.price)}</p>
          </article>
        ))}
      </section>

      <section className="panel chart-panel">
        <div className="panel-header">
          <h2>Chart</h2>
          <div className="chart-tools">
            <div className="range-buttons" aria-label="Chart range">
              {marketRanges.map((item) => (
                <button
                  className={item === range ? "active" : ""}
                  disabled={loading}
                  key={item}
                  onClick={() => onRangeChange(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <span>{selectedAsset?.symbol ?? "BTC"}/USD</span>
          </div>
        </div>
        <div className="chart-grid">
          <svg viewBox="0 0 860 360" role="img" aria-label={`${selectedAsset?.symbol ?? "BTC"} price chart`}>
            <g className="y-axis">
              {chart.yAxis.map((tick) => (
                <g key={`${tick.label}-${tick.y}`}>
                  <line x1="32" x2="768" y1={tick.y} y2={tick.y} />
                </g>
              ))}
            </g>
            <polyline points={chart.points} />
            <circle className="last-point-halo" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="13" />
            <circle className="last-point" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="5" />
          </svg>
          <div className="chart-axis-labels" aria-hidden="true">
            {chart.yAxis.map((tick) => (
              <span key={`${tick.label}-${tick.percent}`} style={{ top: `${tick.percent}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="metrics market-metrics" aria-label="BTC market metrics">
        <MarketMetric icon={<BadgeDollarSign size={18} />} label="Price" value={formatCurrency(selectedAsset?.price ?? 0)} />
        <MarketMetric icon={<Activity size={18} />} label="24h Change" value={formatPercent(selectedAsset?.change24h ?? 0)} tone={(selectedAsset?.change24h ?? 0) >= 0 ? "positive" : "negative"} />
        <MarketMetric icon={<ClipboardList size={18} />} label="Volume" value={formatCompactCurrency(selectedAsset?.volume24h ?? 0)} />
        <MarketMetric icon={<CheckCircle2 size={18} />} label="Signal" value={selectedAsset?.signal ?? "Preview"} />
        <MarketMetric emphasized icon={<RefreshCw size={18} />} label="Last Updated" value={formatDateTime(selectedAsset?.lastUpdated ?? market?.lastUpdated)} />
      </section>
    </section>
  );
}

function PlaceholderView({ title, body }: { title: string; body: string }) {
  return (
    <section className="panel page-panel placeholder-panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <p>{body}</p>
    </section>
  );
}

function ProjectPanel({ projects }: { projects: ProjectSnapshot[]; compact?: boolean }) {
  return (
    <section className="panel project-panel">
      <div className="panel-header">
        <h2>Projects</h2>
        <span>{projects.length}</span>
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-row" key={project.id}>
            <div>
              <div className="project-title">
                <span className={`state-dot ${project.state}`} />
                <strong>{project.name}</strong>
              </div>
              <p>{project.path}</p>
            </div>
            <div className="project-stats">
              <span>{project.tracked_files} files</span>
              <span>{project.open_tasks} tasks</span>
              <span>{project.notes} notes</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContextPanel({ snapshot }: { snapshot: DesktopSnapshot | null }) {
  return (
    <section className="panel context-panel">
      <div className="panel-header">
        <h2>Context</h2>
        <span>{(snapshot?.notes.length ?? 0) + (snapshot?.tasks.length ?? 0)}</span>
      </div>
      <div className="context-list">
        {snapshot?.tasks.map((task) => (
          <article key={`task-${task.id}`} className="context-item">
            <span>Task</span>
            <p>{task.title}</p>
          </article>
        ))}
        {snapshot?.notes.map((note) => (
          <article key={`note-${note.id}`} className="context-item">
            <span>{note.project_name}</span>
            <p>{note.body}</p>
          </article>
        ))}
        {snapshot && snapshot.tasks.length === 0 && snapshot.notes.length === 0 ? (
          <p className="empty">No notes or tasks yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString()}</strong>
      </div>
    </article>
  );
}

function MarketMetric({
  icon,
  emphasized,
  label,
  tone,
  value,
}: {
  emphasized?: boolean;
  icon: React.ReactNode;
  label: string;
  tone?: "positive" | "negative";
  value: string;
}) {
  return (
    <article className={`metric market-metric ${tone ?? ""} ${emphasized ? "emphasized" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

function getSparklineChart(values: number[]) {
  const fallback = [42, 44, 43, 46, 45, 49, 48, 51, 50, 53, 52, 55];
  const data = values.length > 1 ? values : fallback;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const plot = {
    left: 32,
    right: 768,
    top: 44,
    bottom: 316,
  };
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;
  const points = data.map((value, index) => {
    const x = plot.left + (index / (data.length - 1)) * width;
    const y = plot.bottom - ((value - min) / range) * height;
    return { x, y, value };
  });
  const ticks = [max, min + range * 0.66, min + range * 0.33, min];

  return {
    points: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    lastPoint: points[points.length - 1],
    yAxis: ticks.map((value) => ({
      label: formatCompactCurrency(value),
      y: plot.bottom - ((value - min) / range) * height,
      percent: ((plot.bottom - ((value - min) / range) * height) / 360) * 100,
    })),
  };
}

createRoot(document.getElementById("root")!).render(<App />);
