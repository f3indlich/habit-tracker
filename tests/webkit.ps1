param([int]$Port = 8767, [int]$TimeoutSec = 900, [string]$Only = '')
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Не найден Node.js: установите его командой winget install OpenJS.NodeJS.LTS' }
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$PSScriptRoot\node_modules\playwright")) {
  Push-Location $PSScriptRoot
  try { npm install --no-fund --no-audit; npx playwright install webkit } finally { Pop-Location }
}
$server = Start-Process powershell -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\serve.ps1", '-Root', $root, '-Port', $Port)
try {
  Start-Sleep -Seconds 2
  $a = @("$PSScriptRoot\webkit.mjs", '--port', $Port, '--timeout', $TimeoutSec)
  if ($Only) { $a += @('--only', $Only) }
  node @a
  $code = $LASTEXITCODE
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
exit $code
