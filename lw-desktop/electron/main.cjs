const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.join(__dirname, "..", "..");
const useDevServer = process.env.LW_DESKTOP_DEV === "1";
const marketAssets = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];
const marketCacheTtlMs = 120000;
const marketRanges = new Map([
  ["1H", { days: "1", hours: 1 }],
  ["24H", { days: "1", hours: 24 }],
  ["7D", { days: "7", hours: 24 * 7 }],
  ["30D", { days: "30", hours: 24 * 30 }],
]);
let marketCache = null;
const marketRequests = new Map();

function normalizeMarketRange(value) {
  const range = String(value || "7D").toUpperCase();
  return marketRanges.has(range) ? range : "7D";
}

function getMarketCachePath() {
  return path.join(app.getPath("userData"), "market-cache.json");
}

function readMarketCache() {
  if (marketCache) {
    return marketCache;
  }

  try {
    const raw = fs.readFileSync(getMarketCachePath(), "utf8");
    const parsed = JSON.parse(raw);
    marketCache = parsed && parsed.snapshots ? parsed : { snapshots: { "7D": parsed } };
    return marketCache;
  } catch {
    return null;
  }
}

function getCachedMarket(range) {
  return readMarketCache()?.snapshots?.[range] ?? null;
}

function getAnyCachedMarket() {
  const snapshots = readMarketCache()?.snapshots ?? {};
  const entries = Object.values(snapshots);

  return entries
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated))[0] ?? null;
}

function useCachedMarket(snapshot, range, message) {
  return {
    ...snapshot,
    mode: "Cached",
    range,
    error: message,
  };
}

function writeMarketCache(range, snapshot) {
  const cache = readMarketCache() ?? { snapshots: {} };
  cache.snapshots[range] = snapshot;
  marketCache = cache;

  try {
    fs.mkdirSync(path.dirname(getMarketCachePath()), { recursive: true });
    fs.writeFileSync(getMarketCachePath(), JSON.stringify(cache), "utf8");
  } catch {
    // Cache writes should never break the desktop app.
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    title: "Luigi's World",
    backgroundColor: "#0f1115",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (useDevServer) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function getLwExecutable() {
  if (process.platform === "win32") {
    return path.join(workspaceRoot, "lw-system", ".venv", "Scripts", "lw.exe");
  }

  return "lw";
}

function parseCommand(input) {
  const parts = [];
  let current = "";
  let quote = null;

  for (const char of input.trim()) {
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (char === " " && quote === null) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function expandAlias(input) {
  const aliases = new Map([
    ["projects", "project list"],
    ["p", "project list"],
    ["s", "status"],
    ["sg", "suggest"],
    ["d", "doctor"],
    ["n", "note list"],
    ["t", "task list"],
  ]);
  const parts = input.trim().split(/\s+/, 2);
  const alias = aliases.get((parts[0] || "").toLowerCase());

  if (!alias) {
    return input;
  }

  return parts.length === 1 ? alias : `${alias} ${input.trim().slice(parts[0].length).trim()}`;
}

function runLw(args) {
  return new Promise((resolve) => {
    execFile(
      getLwExecutable(),
      args,
      {
        windowsHide: true,
        cwd: workspaceRoot,
        timeout: 120000,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error && typeof error.code === "number" ? error.code : 0,
          stdout,
          stderr,
        });
      },
    );
  });
}

async function getLwConfig() {
  const result = await runLw(["config", "show"]);

  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || "Could not load LW config.");
  }

  const configPathResult = await runLw(["config", "path"]);
  const configPath = configPathResult.stdout.trim();
  const rawConfig = fs.readFileSync(configPath, "utf8");
  return JSON.parse(rawConfig);
}

async function getReportsDir() {
  const config = await getLwConfig();
  return config.reports_dir;
}

async function listReports() {
  const reportsDir = await getReportsDir();

  try {
    return fs
      .readdirSync(reportsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => {
        const filePath = path.join(reportsDir, entry.name);
        const stat = fs.statSync(filePath);
        return {
          name: entry.name,
          path: filePath,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch {
    return [];
  }
}

function getSignal(change24h, volume) {
  if (change24h >= 2 && volume > 0) {
    return "Momentum";
  }

  if (change24h <= -2) {
    return "Pressure";
  }

  return "Neutral";
}

function getPreviewMarket(range = "7D") {
  const now = new Date().toISOString();

  return {
    mode: "Preview",
    range,
    lastUpdated: now,
    assets: marketAssets.map((asset, index) => ({
      ...asset,
      price: 0,
      change24h: 0,
      volume24h: 0,
      signal: index === 0 ? "Preview" : "Watch",
      lastUpdated: now,
      sparkline: [42, 44, 43, 46, 45, 49, 48, 51, 50, 53, 52, 55],
    })),
  };
}

function getChartUrl(range) {
  const rangeConfig = marketRanges.get(range) ?? marketRanges.get("7D");
  const url = new URL("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", rangeConfig.days);
  return url;
}

function filterChartPrices(prices, range) {
  const rangeConfig = marketRanges.get(range) ?? marketRanges.get("7D");
  const cutoff = Date.now() - rangeConfig.hours * 60 * 60 * 1000;

  return prices
    .filter(([timestamp]) => timestamp >= cutoff)
    .map(([, price]) => Number(price))
    .filter((price) => Number.isFinite(price));
}

async function fetchMarketSnapshot(range) {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", marketAssets.map((asset) => asset.id).join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(marketAssets.length));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  try {
    const headers = {
      accept: "application/json",
      "user-agent": "LuigisWorldDesktop/0.1.0",
    };
    const [response, chartResponse] = await Promise.all([
      fetch(url, { headers }),
      fetch(getChartUrl(range), { headers }),
    ]);

    const cached = getCachedMarket(range) ?? getAnyCachedMarket();

    if ((response.status === 429 || chartResponse.status === 429) && cached) {
      return useCachedMarket(cached, range, "CoinGecko rate limit hit. Showing cached live data.");
    }

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    if (!chartResponse.ok) {
      throw new Error(`CoinGecko chart returned ${chartResponse.status}`);
    }

    const [rows, chartRows] = await Promise.all([response.json(), chartResponse.json()]);
    const btcSparkline = filterChartPrices(chartRows.prices ?? [], range);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const now = new Date().toISOString();

    const snapshot = {
      mode: "Live",
      range,
      lastUpdated: now,
      assets: marketAssets.map((asset) => {
        const row = byId.get(asset.id);
        const change24h = Number(row?.price_change_percentage_24h ?? 0);
        const volume24h = Number(row?.total_volume ?? 0);

        return {
          ...asset,
          price: Number(row?.current_price ?? 0),
          change24h,
          volume24h,
          signal: getSignal(change24h, volume24h),
          lastUpdated: row?.last_updated ?? now,
          sparkline: asset.id === "bitcoin" ? btcSparkline : [],
        };
      }),
    };

    writeMarketCache(range, snapshot);
    return snapshot;
  } catch (error) {
    const cached = getCachedMarket(range) ?? getAnyCachedMarket();

    if (cached) {
      return useCachedMarket(
        cached,
        range,
        error instanceof Error ? `${error.message}. Showing cached live data.` : "Could not load market data. Showing cached live data.",
      );
    }

    return {
      ...getPreviewMarket(range),
      error: error instanceof Error ? error.message : "Could not load market data.",
    };
  }
}

async function fetchMarketSnapshotOld() {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", marketAssets.map((asset) => asset.id).join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(marketAssets.length));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h");

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "LuigisWorldDesktop/0.1.0",
      },
    });

    const cached = getCachedMarket("7D");

    if (response.status === 429 && cached) {
      return {
        ...cached,
        mode: "Cached",
        error: "CoinGecko rate limit hit. Showing cached live data.",
      };
    }

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const rows = await response.json();
    const byId = new Map(rows.map((row) => [row.id, row]));
    const now = new Date().toISOString();

    const snapshot = {
      mode: "Live",
      lastUpdated: now,
      assets: marketAssets.map((asset) => {
        const row = byId.get(asset.id);
        const change24h = Number(row?.price_change_percentage_24h ?? 0);
        const volume24h = Number(row?.total_volume ?? 0);

        return {
          ...asset,
          price: Number(row?.current_price ?? 0),
          change24h,
          volume24h,
          signal: getSignal(change24h, volume24h),
          lastUpdated: row?.last_updated ?? now,
          sparkline: row?.sparkline_in_7d?.price ?? [],
        };
      }),
    };

    writeMarketCache("7D", snapshot);
    return snapshot;
  } catch (error) {
    const cached = getCachedMarket("7D");

    if (cached) {
      return {
        ...cached,
        mode: "Cached",
        error: error instanceof Error ? `${error.message}. Showing cached live data.` : "Could not load market data. Showing cached live data.",
      };
    }

    return {
      ...getPreviewMarket(),
      error: error instanceof Error ? error.message : "Could not load market data.",
    };
  }
}

async function getMarketSnapshot(options = {}) {
  const force = Boolean(options.force);
  const range = normalizeMarketRange(options.range);
  const now = Date.now();

  const cached = getCachedMarket(range);

  if (!force && cached && now - Date.parse(cached.lastUpdated) < marketCacheTtlMs) {
    return cached;
  }

  if (!force && marketRequests.has(range)) {
    return marketRequests.get(range);
  }

  const request = fetchMarketSnapshot(range).finally(() => {
    marketRequests.delete(range);
  });

  marketRequests.set(range, request);
  return request;
}

ipcMain.handle("lw:snapshot", async () => {
  const result = await runLw(["app", "snapshot"]);

  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || "Could not load LW snapshot.");
  }

  return JSON.parse(result.stdout);
});

ipcMain.handle("lw:command", async (_event, input) => {
  const cleanInput = String(input || "").trim();

  if (!cleanInput || cleanInput.toLowerCase() === "home") {
    return {
      ok: true,
      code: 0,
      stdout: "Home refreshed.",
      stderr: "",
    };
  }

  const args = parseCommand(expandAlias(cleanInput.replace(/^lw\s+/i, "")));
  return runLw(args);
});

ipcMain.handle("lw:marketSnapshot", async (_event, options) => getMarketSnapshot(options));

ipcMain.handle("lw:selectProjectFolder", async () => {
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ["openDirectory"],
    title: "Select project folder",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("lw:addProject", async (_event, input) => {
  const name = String(input?.name || "").trim();
  const folderPath = String(input?.path || "").trim();
  const projectType = String(input?.type || "workspace").trim() || "workspace";
  const notes = String(input?.notes || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tasks = String(input?.tasks || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!name || !folderPath) {
    return {
      ok: false,
      code: 1,
      stdout: "",
      stderr: "Project name and folder path are required.",
    };
  }

  const results = [];
  const addResult = await runLw(["project", "add", name, "--path", folderPath, "--type", projectType]);
  results.push(addResult);

  if (!addResult.ok) {
    return {
      ...addResult,
      stdout: results.map((result) => result.stdout).filter(Boolean).join("\n"),
      stderr: results.map((result) => result.stderr).filter(Boolean).join("\n"),
    };
  }

  for (const note of notes) {
    results.push(await runLw(["note", "add", name, note]));
  }

  for (const task of tasks) {
    results.push(await runLw(["task", "add", name, task]));
  }

  return {
    ok: results.every((result) => result.ok),
    code: results.find((result) => !result.ok)?.code ?? 0,
    stdout: results.map((result) => result.stdout).filter(Boolean).join("\n"),
    stderr: results.map((result) => result.stderr).filter(Boolean).join("\n"),
  };
});

ipcMain.handle("lw:listReports", async () => listReports());

ipcMain.handle("lw:readReport", async (_event, reportPath) => {
  const reportsDir = path.resolve(await getReportsDir());
  const requestedPath = path.resolve(String(reportPath || ""));

  if (!requestedPath.startsWith(reportsDir)) {
    throw new Error("Report path is outside the reports directory.");
  }

  return fs.readFileSync(requestedPath, "utf8");
});

ipcMain.handle("lw:generateReport", async (_event, identifier) => {
  const cleanIdentifier = String(identifier || "").trim();
  const result = await runLw(cleanIdentifier ? ["report", cleanIdentifier] : ["report"]);
  const reports = await listReports();

  return {
    ...result,
    reports,
  };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
