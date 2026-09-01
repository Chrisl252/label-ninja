param([string]$Base = "https://label-ninja.com")
# Brick 2 production evidence: health, canary register, ONE 3-page export, me math,
# idempotent replay, verify-pdf dimension proof, history. Burns exactly 1 free use.
$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMddHHmmss"
$jar = "$env:TEMP\ln-prod-b2-cookies.txt"
$pdf = "$env:TEMP\ln-prod-b2-$ts.pdf"
if (Test-Path $jar) { Remove-Item $jar }

function JF($t, [string]$p) { try { $o = $t | ConvertFrom-Json; foreach ($x in $p.Split('.')) { $o = $o.$x }; $o } catch { $null } }

function Curl([string[]]$extra) { & curl.exe -s @extra }

Write-Output "=== 1. health ==="
$h = & curl.exe -s -w "`n%{http_code}" "$Base/api/health"
Write-Output $h

Write-Output "=== 2. register canary ln-canary-b2+$ts@bisket.com ==="
$email = "ln-canary-b2+$ts@bisket.com"
$regFile = "$env:TEMP\ln-prod-b2-reg-$ts.json"
[IO.File]::WriteAllText($regFile, '{"email":"' + $email + '","password":"canary-prod-pass-123"}')
$reg = & curl.exe -s -c $jar -w "`n%{http_code}" -X POST "$Base/api/auth/register" -H "Content-Type: application/json" --data-binary "@$regFile"
Write-Output $reg

Write-Output "=== 3. ONE export: 3-page 4x6 bin spec (CODE128 RACK-A-001..003) ==="
$pages = @(); for ($i = 1; $i -le 3; $i++) { $n = "{0:D3}" -f $i; $pages += '{"width_in":4,"height_in":6,"orientation":"portrait","elements":[{"type":"text","x_in":0.2,"y_in":0.3,"w_in":3.6,"text":"BIN RACK-A-' + $n + '","font_size_pt":18,"bold":true},{"type":"rect","x_in":0.15,"y_in":0.15,"w_in":3.7,"h_in":5.7,"line_width_pt":2,"stroke":"#000000"},{"type":"barcode","subtype":"code128","value":"RACK-A-' + $n + '","x_in":0.4,"y_in":2.2,"w_in":3.2,"h_in":0.9,"show_text":true}]}' }
$specFile = "$env:TEMP\ln-prod-b2-spec-$ts.json"
[IO.File]::WriteAllText($specFile, '{"idempotency_key":"prod-b2-' + $ts + '","tool":"bin","format":"pdf","settings":{},"pages":[' + ($pages -join ',') + ']}')
$exp = & curl.exe -s -b $jar -w "`n%{http_code}" -X POST "$Base/api/export" -H "Content-Type: application/json" --data-binary "@$specFile"
$expBody = ($exp -split "`n")[0..($exp.Split("`n").Count - 2)] -join ""
Write-Output $exp
$jobId = JF $expBody "job.id"
Write-Output "jobId=$jobId"

Write-Output "=== 4. me -> remaining/consumed ==="
$me = & curl.exe -s -b $jar "$Base/api/auth/me"
Write-Output $me

Write-Output "=== 5. idempotent replay (same key) ==="
$exp2 = & curl.exe -s -b $jar -w "`n%{http_code}" -X POST "$Base/api/export" -H "Content-Type: application/json" --data-binary "@$specFile"
Write-Output $exp2
Write-Output ("replay same id: " + ((JF (($exp2 -split "`n")[0] -join "") "job.id") -eq $jobId))

Write-Output "=== 6. download + verify-pdf ==="
$dlCode = & curl.exe -s -b $jar -D "$env:TEMP\ln-prod-b2-hdrs.txt" -o $pdf -w "%{http_code}" "$Base/api/export/$jobId/download"
Write-Output "download status=$dlCode"
Get-Content "$env:TEMP\ln-prod-b2-hdrs.txt" | Where-Object { $_ -match 'Content-Type|Content-Disposition|Cache-Control' }
& node "$PSScriptRoot\verify-pdf.mjs" $pdf 288 432 3

Write-Output "=== 7. GET /api/exports ==="
$hist = & curl.exe -s -b $jar "$Base/api/exports"
Write-Output $hist
