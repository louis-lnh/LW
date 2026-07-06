/// <reference types="vite/client" />

type ProjectState = "clean" | "changed" | "unscanned";

type ProjectSnapshot = {
  id: number;
  name: string;
  path: string;
  type: string;
  status: string;
  tracked_files: number;
  last_scan_at: string | null;
  open_tasks: number;
  notes: number;
  state: ProjectState;
  last_changes: {
    new: number;
    modified: number;
    deleted: number;
  };
};

type DesktopSnapshot = {
  status: {
    project_count: number;
    tracked_files: number;
    open_tasks: number;
    notes: number;
    clean_count: number;
    changed_count: number;
    unscanned_count: number;
    projects: ProjectSnapshot[];
  };
  notes: Array<{
    id: number;
    project_id: number;
    project_name: string;
    body: string;
    created_at: string;
  }>;
  tasks: Array<{
    id: number;
    project_id: number;
    project_name: string;
    title: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
};

type CommandResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

type AddProjectInput = {
  name: string;
  path: string;
  type: string;
  notes: string;
  tasks: string;
};

type ReportFile = {
  name: string;
  path: string;
  size: number;
  updatedAt: string;
};

type GenerateReportResult = CommandResult & {
  reports: ReportFile[];
};

type MarketAsset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  signal: string;
  lastUpdated: string;
  sparkline: number[];
};

type MarketRange = "1H" | "24H" | "7D" | "30D";

type MarketSnapshot = {
  mode: "Live" | "Preview" | "Cached";
  range: MarketRange;
  lastUpdated: string;
  assets: MarketAsset[];
  error?: string;
};

interface Window {
  lw: {
    addProject: (input: AddProjectInput) => Promise<CommandResult>;
    generateReport: (identifier?: string) => Promise<GenerateReportResult>;
    listReports: () => Promise<ReportFile[]>;
    getSnapshot: () => Promise<DesktopSnapshot>;
    getMarketSnapshot: (options?: { force?: boolean; range?: MarketRange }) => Promise<MarketSnapshot>;
    readReport: (reportPath: string) => Promise<string>;
    runCommand: (input: string) => Promise<CommandResult>;
    selectProjectFolder: () => Promise<string | null>;
  };
}
