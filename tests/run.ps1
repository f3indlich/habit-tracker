param([int]$Port = 8766, [int]$TimeoutSec = 300, [string]$App = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$browser = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Не найден Microsoft Edge или Google Chrome' }

$server = Start-Process powershell -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\serve.ps1", '-Root', $root, '-Port', $Port)
$prof = Join-Path ([IO.Path]::GetTempPath()) ("habit-tests-" + [guid]::NewGuid())
$debugPort = Get-Random -Minimum 9300 -Maximum 9800
$proc = $null
try {
  Start-Sleep -Seconds 2
  $page = "http://localhost:$Port/tests/?auto"
  $extra = @()
  if ($App) { $page += '&app=' + [Uri]::EscapeDataString($App); $extra = @('--disable-web-security', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process') }
  $proc = Start-Process $browser -PassThru -ArgumentList ($extra + @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', "--user-data-dir=$prof",
    "--remote-debugging-port=$debugPort", '--window-size=1280,1000', $page))
  $target = $null
  for ($i = 0; $i -lt 40 -and -not $target; $i++) {
    Start-Sleep -Milliseconds 500
    try { $target = (Invoke-RestMethod "http://127.0.0.1:$debugPort/json") | Where-Object { $_.type -eq 'page' -and $_.url -like '*tests*' } | Select-Object -First 1 } catch {}
  }
  if (-not $target) { throw 'Браузер не открыл страницу тестов' }
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
  $id = 0
  $eval = {
    param($expr)
    $script:id++
    $msg = @{ id = $script:id; method = 'Runtime.evaluate'; params = @{ expression = $expr; returnByValue = $true } } | ConvertTo-Json -Depth 5 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, [Threading.CancellationToken]::None).Wait()
    $buf = New-Object byte[] 1048576
    while ($true) {
      $ms = New-Object IO.MemoryStream
      do { $res = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf), [Threading.CancellationToken]::None).Result; $ms.Write($buf, 0, $res.Count) } while (-not $res.EndOfMessage)
      $json = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
      if ($json.id -eq $script:id) { return $json.result.result.value }
    }
  }
  $result = $null
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while (-not $result -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    $raw = & $eval 'window.__result ? JSON.stringify(window.__result) : ""'
    if ($raw) { $result = $raw | ConvertFrom-Json }
  }
  $ws.Dispose()
  if (-not $result) { throw "Тесты не завершились за $TimeoutSec с" }
  foreach ($l in $result.lines) {
    if ($l.StartsWith('FAIL')) { Write-Host $l -ForegroundColor Red } else { Write-Host $l }
  }
  Write-Host ''
  if ($result.fail -gt 0) { Write-Host "Не прошло: $($result.fail) из $($result.pass + $result.fail)" -ForegroundColor Red; exit 1 }
  Write-Host "Все $($result.pass) проверок прошли" -ForegroundColor Green
} finally {
  if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
}
