param([string]$Base = "http://127.0.0.1:8787")
# Brick 2 local verification: server-side PDF export pipeline against a running `wrangler dev`.
# Numbered cases from DECISIONS_LOG 2026-08-31 brick 2, updated 2026-10-01: exports are free
# (no 10-batch quota, no 402); the 30/hour per-user rate limit is the only export ceiling.
$ErrorActionPreference = "Stop"

$script:Failures = 0

function Req([string]$Method, [string]$Path, $Body, [string]$Cookie, [string]$OutFile) {
  # curl.exe-based: PS 5.1's HttpClient silently drops Cookie headers set on HttpRequestMessage.
  $tag = [guid]::NewGuid().ToString('N').Substring(0, 8)
  $hf = "$env:TEMP\ln-x-h-$tag.txt"
  $bf = if ($OutFile) { $OutFile } else { "$env:TEMP\ln-x-b-$tag.txt" }
  $pf = "$env:TEMP\ln-x-p-$tag.txt"
  $cArgs = @("-s", "-D", $hf, "-o", $bf, "-w", "%{http_code}", "-X", $Method, "$Base$Path")
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress -Depth 12 }
    [IO.File]::WriteAllText($pf, $json)
    $cArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$pf")
  }
  if ($Cookie) { $cArgs += @("-H", "Cookie: ln_session=$Cookie") }
  $status = [int](& curl.exe @cArgs)
  $bodyText = if ($OutFile) { "(file $OutFile)" } else { [IO.File]::ReadAllText($bf) }
  $headers = Get-Content $hf -ErrorAction SilentlyContinue
  [PSCustomObject]@{
    Status = $status; Body = $bodyText
    SetCookie = (($headers | Where-Object { $_ -like "Set-Cookie:*ln_session*" }) -join " | ")
    ContentDisposition = (($headers | Where-Object { $_ -like "Content-Disposition:*" }) -join "")
    ContentType = (($headers | Where-Object { $_ -like "Content-Type:*" }) -join "")
    CacheControl = (($headers | Where-Object { $_ -like "Cache-Control:*" }) -join "")
  }
}

function Check([string]$Name, [bool]$Pass, [string]$Detail = "") {
  if ($Pass) { Write-Output ("PASS  {0}  [{1}]" -f $Name, $Detail) }
  else { $script:Failures++; Write-Output ("FAIL  {0}  [{1}]" -f $Name, $Detail) }
}

function JsonField($jsonText, [string]$path) {
  try { $o = $jsonText | ConvertFrom-Json; foreach ($p in $path.Split('.')) { $o = $o.$p }; $o } catch { $null }
}

function BinSpec([string]$key, [int]$pages) {
  $pageList = @()
  for ($i = 1; $i -le $pages; $i++) {
    $n = "{0:D3}" -f $i
    $pageList += @"
{"width_in":4,"height_in":6,"orientation":"portrait","elements":[
 {"type":"text","x_in":0.2,"y_in":0.3,"w_in":3.6,"text":"BIN RACK-A-$n","font_size_pt":18,"bold":true,"align":"left"},
 {"type":"rect","x_in":0.15,"y_in":0.15,"w_in":3.7,"h_in":5.7,"line_width_pt":2,"stroke":"#000000"},
 {"type":"line","x1_in":0.2,"y1_in":1.9,"x2_in":3.8,"y2_in":1.9,"line_width_pt":1},
 {"type":"barcode","subtype":"code128","value":"RACK-A-$n","x_in":0.4,"y_in":2.2,"w_in":3.2,"h_in":0.9,"show_text":true},
 {"type":"text","x_in":0.2,"y_in":4.0,"w_in":3.6,"text":"row 3 / shelf B","font_size_pt":10,"align":"center","color":"#333333"}]}
"@ -replace "`r?`n", ""
  }
  '{"idempotency_key":"' + $key + '","tool":"bin","format":"pdf","settings":{},"pages":[' + ($pageList -join ',') + ']}'
}

$mmW = 25 / 25.4; $mmH = 13 / 25.4
function MmSpec([string]$key) {
  ('{"idempotency_key":"' + $key + '","tool":"whatnot","format":"pdf","settings":{},"pages":[' +
    '{"width_in":' + $mmW + ',"height_in":' + $mmH + ',"orientation":"landscape","elements":[' +
    '{"type":"text","x_in":0.05,"y_in":0.06,"w_in":0.9,"text":"25x13","font_size_pt":6,"bold":true},' +
    '{"type":"barcode","subtype":"code128","value":"WN-01","x_in":0.05,"y_in":0.18,"w_in":0.85,"h_in":0.28,"show_text":true}]}]}')
}

function TestPrintSpec([string]$key, [double]$w, [double]$h) {
  '{"idempotency_key":"' + $key + '","tool":"test_print","format":"pdf","settings":{"width_in":' + $w + ',"height_in":' + $h + '}}'
}

# PNG magic + corrupt payload: passes header validation, fails pdf-lib embedPng.
$corruptPng = 'iVBORw0KGgo' + ('A' * 64)
function CorruptImageSpec([string]$key) {
  ('{"idempotency_key":"' + $key + '","tool":"editor","format":"pdf","settings":{},"pages":[' +
    '{"width_in":4,"height_in":6,"elements":[{"type":"image","x_in":0.5,"y_in":1,"w_in":3,"h_in":3,"mime":"image/png","data_base64":"' + $corruptPng + '"}]}]}')
}

function WebpSpec([string]$key) {
  ('{"idempotency_key":"' + $key + '","tool":"editor","format":"pdf","settings":{},"pages":[' +
    '{"width_in":4,"height_in":6,"elements":[{"type":"image","x_in":0.5,"y_in":1,"w_in":3,"h_in":3,"mime":"image/webp","data_base64":"' + $corruptPng + '"}]}]}')
}

# ---- setup: fresh local rate-limit window, temp dir for downloads ----
& npx wrangler d1 execute label-ninja-db --local --command "DELETE FROM rate_limits" | Out-Null
$dl = "$env:TEMP\ln-export-test"; New-Item -ItemType Directory -Path $dl -Force | Out-Null
$ts = Get-Date -Format "yyyyMMddHHmmss"
$password = "local-test-pass-123"

$r = Req "GET" "/api/health" $null $null
if ($r.Status -ne 200) { Write-Output "FATAL: wrangler dev not healthy at $Base (status=$($r.Status))"; exit 1 }

# ================= USER 1: metering, idempotency, compensation =================

# --- case 1: fresh user is free + unlimited ---
$email1 = "ln-b2-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email1; password = $password } | ConvertTo-Json) $null
$c1 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$r = Req "GET" "/api/auth/me" $null $c1
$u = JsonField $r.Body "user"
Check "case1  register fresh user -> plan free, unlimited" ($u.plan -eq 'free' -and $u.unlimited -eq $true) "user=$(($u | ConvertTo-Json -Compress))"

# --- case 2: 3-page bin export -> completed, 3 pages, bytes>0, consumes exactly 1 ---
$r = Req "POST" "/api/export" (BinSpec "b2-$ts-01" 3) $c1
$job1 = JsonField $r.Body "job.id"
$meta1 = JsonField $r.Body "job.output_meta"
Check "case2  export 3-page bin -> 200 completed pages=3 bytes>0" ($r.Status -eq 200 -and (JsonField $r.Body "job.status") -eq 'completed' -and $meta1.pages -eq 3 -and $meta1.bytes -gt 0) "status=$($r.Status) job=$job1 meta=$(($meta1 | ConvertTo-Json -Compress))"
$r = Req "GET" "/api/auth/me" $null $c1
Check "case2b me after export -> still unlimited" ((JsonField $r.Body "user.unlimited") -eq $true) "body=$($r.Body)"

# --- case 3: idempotent replay -> same job id, no double consumption ---
$r = Req "POST" "/api/export" (BinSpec "b2-$ts-01" 3) $c1
Check "case3  same idempotency_key -> same id" ($r.Status -eq 200 -and (JsonField $r.Body "job.id") -eq $job1) "status=$($r.Status) id=$(JsonField $r.Body 'job.id')"

# --- cases 8/10 fixtures: mm label (25x13mm) + test_print (2x1in), then more exports ---
$r = Req "POST" "/api/export" (MmSpec "b2-$ts-mm") $c1
$mmJob = JsonField $r.Body "job.id"
Check "case8a mm 25x13mm export -> 200" ($r.Status -eq 200 -and (JsonField $r.Body "job.status") -eq 'completed') "status=$($r.Status) job=$mmJob"
$r = Req "POST" "/api/export" (TestPrintSpec "b2-$ts-tp" 2 1) $c1
$tpJob = JsonField $r.Body "job.id"
Check "case10a test_print 2x1 -> 200 completed" ($r.Status -eq 200 -and (JsonField $r.Body "job.status") -eq 'completed' -and (JsonField $r.Body "job.tool") -eq 'test_print') "status=$($r.Status) job=$tpJob"

for ($i = 4; $i -le 9; $i++) {
  $k = "b2-$ts-{0:D2}" -f $i
  $r = Req "POST" "/api/export" (BinSpec $k 1) $c1
  if ($r.Status -ne 200) { Check "case4 fill export $i" $false "status=$($r.Status) body=$($r.Body)" }
}
# --- case 9: render failure (valid PNG magic, corrupt payload) -> 500, no job listed ---
$r = Req "POST" "/api/export" (CorruptImageSpec "b2-$ts-corrupt") $c1
Check "case9a corrupt PNG payload -> 500 export_failed" ($r.Status -eq 500 -and (JsonField $r.Body "error.code") -eq 'export_failed') "status=$($r.Status) body=$($r.Body)"
$r = Req "POST" "/api/export" (WebpSpec "b2-$ts-webp") $c1
Check "case9c webp image -> 400 unsupported_image_format" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'unsupported_image_format') "status=$($r.Status) body=$($r.Body)"

# --- case 4 completion: tenth export succeeds ---
$r = Req "POST" "/api/export" (BinSpec "b2-$ts-10" 1) $c1
Check "case4b tenth export -> 200 completed" ($r.Status -eq 200 -and (JsonField $r.Body "job.status") -eq 'completed') "status=$($r.Status)"

# --- case 5: eleventh -> still free (no paywall) ---
$r = Req "POST" "/api/export" (BinSpec "b2-$ts-11" 1) $c1
Check "case5  eleventh export -> 200 completed (free, no 402)" ($r.Status -eq 200 -and (JsonField $r.Body "job.status") -eq 'completed') "status=$($r.Status) body=$($r.Body)"

# --- case 6: history lists 11; delete one -> gone; download deleted -> 410 ---
$r = Req "GET" "/api/exports" $null $c1
$exports = JsonField $r.Body "exports"; if ($exports -is [System.Array]) { $listCount = $exports.Count } else { $listCount = 1 }
Check "case6a GET /api/exports lists 11 jobs" ($r.Status -eq 200 -and $listCount -eq 11) "status=$($r.Status) count=$listCount"
$exports = JsonField $r.Body "exports"
$secondJob = $exports[0].id # newest-first: the 11th export
$r = Req "DELETE" "/api/export/$secondJob" $null $c1
Check "case6b DELETE export -> 200" ($r.Status -eq 200) "status=$($r.Status)"
$r = Req "GET" "/api/exports" $null $c1
$exports = (JsonField $r.Body "exports"); if ($exports -is [System.Array]) { $listCount = $exports.Count } else { $listCount = 1 }
Check "case6c deleted job gone from list -> 10" ($listCount -eq 10) "count=$listCount"
$r = Req "GET" "/api/export/$secondJob/download" $null $c1
Check "case6d download after delete -> 410 expired" ($r.Status -eq 410 -and (JsonField $r.Body "error.code") -eq 'expired') "status=$($r.Status) body=$($r.Body)"

# --- case 7: valid download -> %PDF bytes + Content-Disposition ---
$pdf1 = "$dl\b2-$ts-job1.pdf"
$r = Req "GET" "/api/export/$job1/download" $null $c1 $pdf1
$head = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($pdf1)[0..3])
Check "case7  download -> 200 %PDF magic + Content-Disposition + no-store" ($r.Status -eq 200 -and $head -eq '%PDF' -and $r.ContentDisposition -match 'attachment; filename="bin-\d{4}-\d{2}-\d{2}\.pdf"' -and $r.CacheControl -match 'no-store') "status=$($r.Status) magic=$head cd=$($r.ContentDisposition) cache=$($r.CacheControl)"

# --- case 8: exact PDF dimensions (pdf-lib proof) ---
& node "$PSScriptRoot\verify-pdf.mjs" $pdf1 288 432 3
Check "case8b 4x6 job = 288.00 x 432.00 pt x 3 pages" ($LASTEXITCODE -eq 0) "verify-pdf exit=$LASTEXITCODE"
$pdfMm = "$dl\b2-$ts-mm.pdf"
$r = Req "GET" "/api/export/$mmJob/download" $null $c1 $pdfMm
& node "$PSScriptRoot\verify-pdf.mjs" $pdfMm 70.87 36.85 1
Check "case8c 25x13mm job = 70.87 x 36.85 pt x 1 page" ($LASTEXITCODE -eq 0) "verify-pdf exit=$LASTEXITCODE status=$($r.Status)"

# --- case 10: test_print dimension proof ---
$pdfTp = "$dl\b2-$ts-tp.pdf"
$r = Req "GET" "/api/export/$tpJob/download" $null $c1 $pdfTp
& node "$PSScriptRoot\verify-pdf.mjs" $pdfTp 144 72 1
Check "case10b test_print 2x1 = 144.00 x 72.00 pt" ($LASTEXITCODE -eq 0) "verify-pdf exit=$LASTEXITCODE status=$($r.Status)"

# ================= USER 2: ownership (404, never 403) =================
$email2 = "ln-b2-own-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email2; password = $password } | ConvertTo-Json) $null
$c2 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$r = Req "GET" "/api/export/$job1" $null $c2
Check "case11 other user's job id -> 404 (no existence leak)" ($r.Status -eq 404 -and (JsonField $r.Body "error.code") -eq 'not_found') "status=$($r.Status) body=$($r.Body)"
$r = Req "GET" "/api/export/$job1/download" $null $c2
Check "case11b other user's download -> 404" ($r.Status -eq 404) "status=$($r.Status)"

# ================= USER 4: parallel distinct exports both succeed =================
$email4 = "ln-b2-race-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email4; password = $password } | ConvertTo-Json) $null
$c4 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$specA = BinSpec "b2-$ts-race-A" 1; $specB = BinSpec "b2-$ts-race-B" 1
$pa = "$env:TEMP\ln-race-a-$ts.json"; $pb = "$env:TEMP\ln-race-b-$ts.json"
[IO.File]::WriteAllText($pa, $specA); [IO.File]::WriteAllText($pb, $specB)
$jj = @()
$jj += Start-Job -ScriptBlock { param($b, $ck, $p) & curl.exe -s -o "$env:TEMP\ln-race-out-a.json" -w "%{http_code}" -X POST "$b/api/export" -H "Content-Type: application/json" -H "Cookie: ln_session=$ck" --data-binary "@$p" } -ArgumentList $Base, $c4, $pa
$jj += Start-Job -ScriptBlock { param($b, $ck, $p) & curl.exe -s -o "$env:TEMP\ln-race-out-b.json" -w "%{http_code}" -X POST "$b/api/export" -H "Content-Type: application/json" -H "Cookie: ln_session=$ck" --data-binary "@$p" } -ArgumentList $Base, $c4, $pb
Wait-Job $jj -Timeout 60 | Out-Null
$codes = @($jj | ForEach-Object { [string](Receive-Job $_) }); $jj | Remove-Job
$okCount = @($codes | Where-Object { $_ -eq '200' }).Count
Check "case12b parallel 2xPOST distinct keys -> two 200s" ($okCount -eq 2) "codes=$($codes -join ',')"
$r = Req "GET" "/api/exports" $null $c4
$exports = (JsonField $r.Body "exports"); if ($exports -is [System.Array]) { $raceCount = $exports.Count } else { $raceCount = 1 }
Check "case12c race user -> 2 completed jobs" ($raceCount -eq 2) "jobs=$raceCount"

# ================= USER 3: export rate limit (30/hour) =================
$email3 = "ln-b2-rl-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email3; password = $password } | ConvertTo-Json) $null
$c3 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$saw200 = 0
for ($i = 1; $i -le 30; $i++) {
  $r = Req "POST" "/api/export" (BinSpec ("b2-$ts-rl-{0:D2}" -f $i) 1) $c3
  if ($r.Status -eq 200) { $saw200++ }
}
$r = Req "POST" "/api/export" (BinSpec "b2-$ts-rl-31" 1) $c3
Check "case13 31st export in hour -> 429 rate_limited (30x200 first)" ($r.Status -eq 429 -and (JsonField $r.Body "error.code") -eq 'rate_limited' -and $saw200 -eq 30) "31st=$($r.Status) saw200=$saw200 body=$($r.Body)"

Write-Output ("RESULT failures={0}" -f $script:Failures)
if ($script:Failures -gt 0) { exit 1 } else { exit 0 }
