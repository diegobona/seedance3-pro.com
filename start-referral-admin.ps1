$ErrorActionPreference = 'Stop'
$referralRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$referralUrl = 'http://127.0.0.1:4319/admin/referrals'

function Test-ReferralAdmin {
  try {
    $response = Invoke-WebRequest -Uri $referralUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content.Contains('AnyPoses')
  } catch {
    return $false
  }
}

if (-not (Test-ReferralAdmin)) {
  $referralNode = (Get-Command node -ErrorAction Stop).Source
  $referralLogDir = Join-Path $referralRoot '.pose-case-run'
  New-Item -ItemType Directory -Path $referralLogDir -Force | Out-Null
  $referralPreviousPort = $env:PORT
  try {
    $env:PORT = '4319'
    Start-Process -FilePath $referralNode -ArgumentList @('server.local.js') `
      -WorkingDirectory $referralRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $referralLogDir 'referral-cms-out.log') `
      -RedirectStandardError (Join-Path $referralLogDir 'referral-cms-error.log') | Out-Null
  } finally {
    $env:PORT = $referralPreviousPort
  }

  $referralDeadline = (Get-Date).AddSeconds(15)
  while (-not (Test-ReferralAdmin)) {
    if ((Get-Date) -ge $referralDeadline) {
      throw "Could not start the statistics dashboard. See $referralLogDir\referral-cms-error.log"
    }
    Start-Sleep -Milliseconds 300
  }
}

Start-Process $referralUrl
