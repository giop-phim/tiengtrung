param(
  [string]$Url = "http://127.0.0.1:4173/index.html",
  [string]$Out = "",
  [string]$Script = "",
  [string]$ScriptFile = "",
  [int]$Wait = 6000,
  [int]$Width = 1280,
  [int]$Height = 900,
  [int]$Port = 9222,
  [switch]$Keep
)

$ErrorActionPreference = "Stop"

function New-Target {
  $list = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list"
  $page = $list | Where-Object { $_.type -eq "page" -and $_.url -eq "about:blank" } | Select-Object -First 1
  if (-not $page) {
    $page = Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:$Port/json/new?about:blank"
  }
  return $page
}

$target = New-Target
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, $ct).Wait()

$script:id = 0
$script:pending = @{}
$script:logs = New-Object System.Collections.ArrayList

function Send-Cdp {
  param([string]$Method, [hashtable]$Params = @{})
  $script:id++
  $payload = @{ id = $script:id; method = $Method; params = $Params } | ConvertTo-Json -Depth 20 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $seg = [System.ArraySegment[byte]]::new($bytes)
  $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
  $buffer = New-Object byte[] 65536
  $ms = New-Object System.IO.MemoryStream
  do {
    $recvSeg = [System.ArraySegment[byte]]::new($buffer)
    $res = $ws.ReceiveAsync($recvSeg, $ct).Result
    $ms.Write($buffer, 0, $res.Count)
  } while (-not $res.EndOfMessage)
  $text = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
  $obj = $text | ConvertFrom-Json
  while ($obj.id -ne $script:id) {
    if ($obj.method -eq "Runtime.consoleAPICalled") {
      $vals = ($obj.params.args | ForEach-Object { $_.value }) -join " "
      [void]$script:logs.Add("console." + $obj.params.type + ": " + $vals)
    } elseif ($obj.method -eq "Runtime.exceptionThrown") {
      [void]$script:logs.Add("EXCEPTION: " + $obj.params.exceptionDetails.text + " " + $obj.params.exceptionDetails.exception.description)
    } elseif ($obj.method -eq "Log.entryAdded") {
      [void]$script:logs.Add("log." + $obj.params.entry.level + ": " + $obj.params.entry.text)
    } elseif ($obj.method -eq "Network.responseReceived" -and $obj.params.response.url -match "dictvoice|gettts|translate_tts|synthesis|archive.org") {
      $u = $obj.params.response.url
      if ($u.Length -gt 90) { $u = $u.Substring(0, 90) }
      [void]$script:logs.Add("net " + $obj.params.response.status + " " + $obj.params.response.mimeType + " " + $u)
    } elseif ($obj.method -eq "Network.responseReceived" -and $obj.params.response.status -ge 400) {
      $u = $obj.params.response.url
      if ($u.Length -gt 140) { $u = $u.Substring(0, 140) }
      [void]$script:logs.Add("HTTP " + $obj.params.response.status + " " + $obj.params.response.mimeType + " " + $u)
    } elseif ($obj.method -eq "Network.loadingFailed") {
      [void]$script:logs.Add("netfail " + $obj.params.errorText + " blocked=" + $obj.params.blockedReason + " cors=" + $obj.params.corsErrorStatus.corsError + " rid=" + $obj.params.requestId)
    }
    $ms = New-Object System.IO.MemoryStream
    do {
      $recvSeg = [System.ArraySegment[byte]]::new($buffer)
      $res = $ws.ReceiveAsync($recvSeg, $ct).Result
      $ms.Write($buffer, 0, $res.Count)
    } while (-not $res.EndOfMessage)
    $text = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
    $obj = $text | ConvertFrom-Json
  }
  return $obj
}

function Evaluate-Js {
  param([string]$Expression, [switch]$Await)
  $r = Send-Cdp "Runtime.evaluate" @{ expression = $Expression; returnByValue = $true; awaitPromise = [bool]$Await; userGesture = $true }
  if ($r.result.exceptionDetails) {
    return "EVAL_ERROR: " + $r.result.exceptionDetails.text + " " + $r.result.exceptionDetails.exception.description
  }
  return $r.result.result.value
}

Send-Cdp "Page.enable" | Out-Null
Send-Cdp "Runtime.enable" | Out-Null
Send-Cdp "Log.enable" | Out-Null
Send-Cdp "Network.enable" | Out-Null
Send-Cdp "Emulation.setDeviceMetricsOverride" @{ width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false } | Out-Null
try { Send-Cdp "Emulation.setFocusEmulationEnabled" @{ enabled = $true } | Out-Null } catch { }
try { Send-Cdp "Page.bringToFront" | Out-Null } catch { }
Send-Cdp "Page.navigate" @{ url = $Url } | Out-Null
Start-Sleep -Milliseconds $Wait

$ready = Evaluate-Js "JSON.stringify({ready: !!window.__sceneReady, fallback: (function(){var f=document.getElementById('sceneFallback');return f? !f.hidden : null;})(), body: document.body.className, webgl: (function(){try{var c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return String(e)}})()})"
Write-Output ("STATE " + $ready)

if ($ScriptFile) {
  $Script = [System.IO.File]::ReadAllText($ScriptFile)
}
if ($Script) {
  $result = Evaluate-Js $Script -Await
  Write-Output ("RESULT " + $result)
}

if ($Out) {
  $shot = Send-Cdp "Page.captureScreenshot" @{ format = "png"; captureBeyondViewport = $false }
  [System.IO.File]::WriteAllBytes($Out, [Convert]::FromBase64String($shot.result.data))
  Write-Output ("SHOT " + $Out)
}

if ($script:logs.Count -gt 0) {
  Write-Output "LOGS"
  $script:logs | ForEach-Object { Write-Output $_ }
}

if (-not $Keep) {
  try { $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait() } catch { }
}
