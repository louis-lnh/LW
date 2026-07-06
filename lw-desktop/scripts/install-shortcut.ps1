param(
    [string]$ShortcutName = "Luigi's World Desktop"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ElectronExe = Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"
$DistIndex = Join-Path $ProjectRoot "dist\index.html"

if (-not (Test-Path $ElectronExe)) {
    throw "Missing Electron runtime. Run npm install in $ProjectRoot"
}

if (-not (Test-Path $DistIndex)) {
    Push-Location $ProjectRoot
    try {
        npm run build
    }
    finally {
        Pop-Location
    }
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ElectronExe
$Shortcut.Arguments = "`"$ProjectRoot`""
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Open Luigi's World Desktop."
$Shortcut.Save()

Write-Host "Desktop shortcut: $ShortcutPath"
