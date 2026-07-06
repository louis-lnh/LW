param(
    [string]$InstallDir = "$env:USERPROFILE\.local\bin",
    [switch]$SkipShortcut
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$LwExe = Join-Path $ProjectRoot ".venv\Scripts\lw.exe"

if (-not (Test-Path $VenvPython)) {
    throw "Missing virtual environment Python at $VenvPython. Run: python -m venv .venv"
}

Push-Location $ProjectRoot
try {
    & $VenvPython -m pip install -e .
}
finally {
    Pop-Location
}

if (-not (Test-Path $LwExe)) {
    throw "Expected launcher was not created at $LwExe"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$CmdShim = @"
@echo off
"$LwExe" %*
"@

$PsShim = @"
& "$LwExe" @args
"@

Set-Content -Path (Join-Path $InstallDir "lw.cmd") -Value $CmdShim -Encoding ASCII
Set-Content -Path (Join-Path $InstallDir "lw.ps1") -Value $PsShim -Encoding ASCII

if (-not $SkipShortcut) {
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $Desktop "Luigi's World Shell.lnk"
    $Shell = New-Object -ComObject WScript.Shell
    $Shortcut = $Shell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-NoExit -Command `"lw shell`""
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.Description = "Open the Luigi's World interactive shell."
    $Shortcut.Save()
}

$PathEntries = $env:Path -split ";" | Where-Object { $_ }
$InstallDirOnPath = $PathEntries | Where-Object { $_.TrimEnd("\") -ieq $InstallDir.TrimEnd("\") }

Write-Host "Installed lw launcher to: $InstallDir"
if ($InstallDirOnPath) {
    Write-Host "PATH check: OK"
}
else {
    Write-Host "PATH check: $InstallDir is not on PATH for this terminal."
    Write-Host "Add it to your user PATH, then open a new terminal."
}

if (-not $SkipShortcut) {
    Write-Host "Desktop shortcut: Luigi's World Shell"
}

Write-Host "Try: lw doctor"
