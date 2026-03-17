$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = $scriptDir
$logFile = Join-Path $projectDir "cms-start.log"

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $logFile -Value $line
  Write-Host $Message
}

Set-Location -LiteralPath $projectDir
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Launcher started" | Set-Content -Path $logFile

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Log "npm was not found. Please install Node.js and reopen terminal."
  Read-Host "Press Enter to exit"
  exit 1
}

$nodeModules = Join-Path $projectDir "node_modules"
if (-not (Test-Path -LiteralPath $nodeModules)) {
  Write-Log "Installing dependencies..."
  npm install
}

Write-Log "Starting local CMS..."
try {
  $conn = Get-NetTCPConnection -LocalPort 4310 -State Listen -ErrorAction Stop | Select-Object -First 1
  if ($conn -and $conn.OwningProcess) {
    Write-Log ("Stopping old CMS process on port 4310, PID: {0}" -f $conn.OwningProcess)
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  }
} catch {
}
Start-Process "http://localhost:4310/admin"
npm run start:cms
$exitCode = $LASTEXITCODE
Write-Log ("CMS process exited with code: {0}" -f $exitCode)
Write-Host ("Log file: {0}" -f $logFile)
Read-Host "Press Enter to exit"
