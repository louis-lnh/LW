# Luigi's World Desktop

Luigi's World Desktop is the first visual app shell for the `lw` command engine.

The app currently provides:

- A custom Electron desktop window.
- A home dashboard backed by `lw app snapshot`.
- Live project, file, note, and task metrics.
- A command bar that runs existing `lw` commands without showing a terminal.
- In-app command routing for visual views such as `home`, `projects`, and `btc`.
- Shell-style aliases such as `projects`, `s`, and `sg`.
- Live BTC market data using CoinGecko, with a small watchlist foundation.

## Market Commands

```txt
btc
btc status
btc refresh
btc report
btc alert set <condition>
```

The first market version tracks BTC, ETH, and SOL. BTC is the primary detail view with live price, 24h change, volume, signal, chart, last updated, and Preview/Live mode.

## Projects Page

The Projects page can add a local project through a native folder picker. After choosing a folder, the user can confirm the project name/type and optionally add initial notes or tasks before the project is registered in the `lw` core.

## Development

```powershell
npm install
npm run app
```

## Built App

```powershell
npm run build
.\scripts\install-shortcut.ps1
```

The shortcut opens the built desktop app directly:

```txt
C:\Users\louis\OneDrive\Desktop\Luigi's World Desktop.lnk
```

The Python CLI remains the core brain. The desktop app calls into the existing `lw` executable and should not duplicate project state.
