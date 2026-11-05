param([int]$Port = 8766, [int]$TimeoutSec = 900, [string]$Only = '', [switch]$Live, [string]$LiveUrl = 'https://f3indlich.github.io/habit-tracker/')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$browser = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Не найден Microsoft Edge или Google Chrome' }

function Get-MainFile($path) {
  $psi = New-Object Diagnostics.ProcessStartInfo 'git', "-C `"$root`" show origin/main:$path"
  $psi.UseShellExecute = $false; $psi.RedirectStandardOutput = $true; $psi.StandardOutputEncoding = [Text.Encoding]::UTF8
  $p = [Diagnostics.Process]::Start($psi)
  $text = $p.StandardOutput.ReadToEnd(); $p.WaitForExit()
  if ($p.ExitCode) { throw "В ветке main нет файла $path" }
  $text.TrimStart([char]0xFEFF)
}

$server = $null
if (-not $Live) { $server = Start-Process powershell -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\serve.ps1", '-Root', $root, '-Port', $Port) }
$prof = Join-Path ([IO.Path]::GetTempPath()) ("habit-tests-" + [guid]::NewGuid())
$debugPort = Get-Random -Minimum 9300 -Maximum 9800
$proc = $null
try {
  Start-Sleep -Seconds 2
  $page = 'about:blank'
  if (-not $Live) {
    $page = "http://localhost:$Port/tests/?auto"
    if ($Only) { $page += '&only=' + [Uri]::EscapeDataString($Only) }
  }
  $proc = Start-Process $browser -PassThru -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', "--user-data-dir=$prof",
    "--remote-debugging-port=$debugPort", '--window-size=1280,1000', $page)
  $target = $null
  for ($i = 0; $i -lt 40 -and -not $target; $i++) {
    Start-Sleep -Milliseconds 500
    try { $target = (Invoke-RestMethod "http://127.0.0.1:$debugPort/json") | Where-Object { $_.type -eq 'page' -and ($Live -or $_.url -like '*tests*') } | Select-Object -First 1 } catch {}
  }
  if (-not $target) { throw 'Браузер не открыл страницу тестов' }
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
  $id = 0
  $cdp = {
    param($method, $params)
    $script:id++
    $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 5 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, [Threading.CancellationToken]::None).Wait()
    $buf = New-Object byte[] 1048576
    while ($true) {
      $ms = New-Object IO.MemoryStream
      do { $res = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf), [Threading.CancellationToken]::None).Result; $ms.Write($buf, 0, $res.Count) } while (-not $res.EndOfMessage)
      $json = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
      if ($json.id -eq $script:id) { return $json.result }
    }
  }
  $eval = { param($expr) (& $cdp 'Runtime.evaluate' @{ expression = $expr; returnByValue = $true }).result.value }
  $result = $null
  if ($Live) {
    & git -C $root fetch origin main --quiet
    if ($LASTEXITCODE) { throw 'Не удалось получить ветку main' }
    & $cdp 'Emulation.setDeviceMetricsOverride' @{ width = 393; height = 852; deviceScaleFactor = 2; mobile = $false } | Out-Null
    $open = {
      $stamp = [guid]::NewGuid().ToString('N')
      & $cdp 'Page.navigate' @{ url = "${LiveUrl}?test&r=$stamp" } | Out-Null
      for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Milliseconds 250
        if ((& $eval 'document.readyState + location.search') -eq "complete?test&r=$stamp") { return }
      }
      throw "Сайт $LiveUrl не открылся"
    }
    $picked = @($Only -split ',' | Where-Object { $_ })
    $suites = [regex]::Matches((Get-MainFile 'tests/index.html'), "\['([^']+)', '([\w.]+\.test\.js)'\]") | ForEach-Object { [pscustomobject]@{ Title = $_.Groups[1].Value; File = $_.Groups[2].Value } } |
      Where-Object { -not $picked.Count -or $picked -contains $_.File.Replace('.test.js', '') }
    $lines = New-Object Collections.ArrayList
    $pass = 0; $fail = 0; $skipped = @()
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    foreach ($s in $suites) {
      $body = Get-MainFile "tests/$($s.File)"
      if ($body -match 'frameElement|\bparent\.|__serverSrc') { $skipped += $s.Title; continue }
      if ((Get-Date) -gt $deadline) { throw "Тесты не завершились за $TimeoutSec с" }
      [void]$lines.Add("== $($s.Title)")
      & $open
      & $eval "Object.keys(localStorage).filter(k => k.startsWith('habit-tracker-test')).forEach(k => localStorage.removeItem(k))" | Out-Null
      & $open
      Start-Sleep -Milliseconds 900
      & $eval "window.__hits = []; document.addEventListener('securitypolicyviolation', e => __hits.push(e.violatedDirective + ' ' + e.blockedURI)); 1" | Out-Null
      $r = & $cdp 'Runtime.evaluate' @{ expression = "(async () => {`n$body`n})()"; awaitPromise = $true; returnByValue = $true; allowUnsafeEvalBlockedByCSP = $false }
      if ($r.exceptionDetails) {
        [void]$lines.Add("FAIL $($s.File): $($r.exceptionDetails.exception.description)"); $fail++
        continue
      }
      $hits = & $eval 'JSON.stringify(__hits.length > (window.__cspExpected || 0) ? __hits : [])'
      foreach ($l in ([string]$r.result.value + $(if ($hits -eq '[]') { "`nPASS no CSP violations" } else { "`nFAIL no CSP violations :: $hits" })) -split "`n") {
        if ($l.StartsWith('PASS')) { $pass++ } elseif ($l.StartsWith('FAIL')) { $fail++ }
        [void]$lines.Add($l)
      }
    }
    if ($skipped) { [void]$lines.Add("Пропущены, нужен фрейм или код сервера: $($skipped -join ', ')") }
    [void]$lines.Add("Сайт: $LiveUrl, версия: $(& $eval "document.querySelector('link[rel=stylesheet]').getAttribute('href')")")
    $result = [pscustomobject]@{ pass = $pass; fail = $fail; lines = $lines }
  } else {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while (-not $result -and (Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 1
      $raw = & $eval 'window.__result ? JSON.stringify(window.__result) : ""'
      if ($raw) { $result = $raw | ConvertFrom-Json }
    }
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
