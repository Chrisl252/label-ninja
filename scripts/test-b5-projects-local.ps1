param(
  [string]$Base = "http://127.0.0.1:8787"
)
# Brick 5 local verification: projects API lifecycle against a running `wrangler dev`.
# Covers: auth gate, create/list/get/patch/delete, list-shape (never data_json),
# newest-first ordering, name/tool/data validation (incl. >256KB), cross-user 404s,
# is_template flag, and the 60-writes/hour per-user rate limit.
$ErrorActionPreference = "Stop"

$script:Failures = 0
$tag = [guid]::NewGuid().ToString('N').Substring(0, 8)

function Req([string]$Method, [string]$Path, $Body, [string]$Cookie) {
  # curl.exe-based: PS 5.1's HttpClient silently drops Cookie headers set on HttpRequestMessage.
  $t = [guid]::NewGuid().ToString('N').Substring(0, 8)
  $hf = "$env:TEMP\ln-b5-h-$t.txt"
  $bf = "$env:TEMP\ln-b5-b-$t.txt"
  $pf = "$env:TEMP\ln-b5-p-$t.txt"
  $cArgs = @("-s", "-D", $hf, "-o", $bf, "-w", "%{http_code}", "-X", $Method, "$Base$Path")
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress -Depth 12 }
    [IO.File]::WriteAllText($pf, $json)
    $cArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$pf")
  }
  if ($Cookie) { $cArgs += @("-H", "Cookie: ln_session=$Cookie") }
  $status = [int](& curl.exe @cArgs)
  $bodyText = [IO.File]::ReadAllText($bf)
  $headers = Get-Content $hf -ErrorAction SilentlyContinue
  [PSCustomObject]@{
    Status = $status; Body = $bodyText
    SetCookie = (($headers | Where-Object { $_ -like "Set-Cookie:*ln_session*" }) -join " | ")
  }
}

function Check([string]$Name, [bool]$Pass, [string]$Detail = "") {
  if ($Pass) { Write-Output ("PASS  {0}  [{1}]" -f $Name, $Detail) }
  else { $script:Failures++; Write-Output ("FAIL  {0}  [{1}]" -f $Name, $Detail) }
}

function JsonField($jsonText, [string]$path) {
  try {
    $o = $jsonText | ConvertFrom-Json
    foreach ($rawPart in $path.Split('.')) {
      $part = $rawPart.Trim('"')
      if ($part -match '^([^\[]+)\[(\d+)\]$') {
        $o = $o.($Matches[1])
        $o = @($o)[[int]$Matches[2]]
      } else {
        $o = $o.$part
      }
    }
    $o
  } catch { $null }
}

function Register([string]$email) {
  $r = Req "POST" "/api/auth/register" @{ email = $email; password = "b5-test-pass-123456" } $null
  $tok = $r.SetCookie
  if ($tok -match "ln_session=([0-9a-f]+)") { $Matches[1] } else { $null }
}

# ---- setup: two fresh users (run-unique emails; rate_limits persist across runs) ----
$cookieA = Register "b5-a-$tag@bisket.com"
$cookieB = Register "b5-b-$tag@bisket.com"
Check "setup: two users registered" ($null -ne $cookieA -and $null -ne $cookieB) $tag

# ---- auth gate ----
$r = Req "GET" "/api/projects" $null $null
Check "signed-out list -> 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Req "POST" "/api/projects" @{ name = "x"; tool = "bin"; data = @{} } $null
Check "signed-out create -> 401" ($r.Status -eq 401) "status=$($r.Status)"

# ---- create ----
$p1Body = @{ name = "Bin reset shelf A"; tool = "bin"; data = @{ meta = @{ version = 1; tool = "bin" }; values = @{ "bin-prefix" = "BIN "; "bin-start" = "1" } } }
$r = Req "POST" "/api/projects" $p1Body $cookieA
$id1 = JsonField $r.Body "project.id"
Check "create -> 200 + uuid id" ($r.Status -eq 200 -and $id1 -match "^[0-9a-f-]{36}$") "status=$($r.Status) id=$id1"
Check "create echoes name+tool, no data_json" ((JsonField $r.Body "project.name") -eq "Bin reset shelf A" -and (JsonField $r.Body "project.tool") -eq "bin" -and ($r.Body -notmatch "data_json") -and ($r.Body -notmatch '"data"'))

$r = Req "POST" "/api/projects" @{ name = "   "; tool = "bin"; data = @{} } $cookieA
Check "create blank name -> 400" ($r.Status -eq 400) "status=$($r.Status) code=$(JsonField $r.Body 'error.code')"
$longName = "x" * 81
$r = Req "POST" "/api/projects" @{ name = $longName; tool = "bin"; data = @{} } $cookieA
Check "create 81-char name -> 400" ($r.Status -eq 400) "status=$($r.Status)"
$r = Req "POST" "/api/projects" @{ name = "ok"; tool = "spreadsheet"; data = @{} } $cookieA
Check "create unknown tool -> 400" ($r.Status -eq 400) "status=$($r.Status)"

# >256 KiB data: 270,000-char string inside data (body < 300 KiB read cap, so the 400 comes from the data cap)
$big = "y" * 270000
$r = Req "POST" "/api/projects" @{ name = "big"; tool = "bin"; data = @{ blob = $big } } $cookieA
Check "create 256KB+ data -> 400 data_too_large" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq "data_too_large") "status=$($r.Status) code=$(JsonField $r.Body 'error.code')"
$r = Req "POST" "/api/projects" @{ name = "arr"; tool = "bin"; data = @("not", "an", "object") } $cookieA
Check "create array data -> 400" ($r.Status -eq 400) "status=$($r.Status)"

# template flag
$r = Req "POST" "/api/projects" @{ name = "My template"; tool = "editor"; data = @{ meta = @{ version = 1; tool = "editor" }; preset = "standard"; elements = @() }; is_template = $true } $cookieA
$idT = JsonField $r.Body "project.id"
Check "create is_template=true -> flag 1" ((JsonField $r.Body "project.is_template") -eq 1) "is_template=$(JsonField $r.Body 'project.is_template')"

# ---- list: newest-updated first, summary shape only ----
$r = Req "GET" "/api/projects?limit=50" $null $cookieA
$first = JsonField $r.Body "projects[0].id"
Check "list -> 200, newest first, no data_json" ($r.Status -eq 200 -and $first -eq $idT -and ($r.Body -notmatch "data_json") -and ($r.Body -notmatch '"data"')) "status=$($r.Status) first=$first want=$idT"
$names = @((JsonField $r.Body "projects") | ForEach-Object { $_.name })
Check "list carries id,name,tool,is_template,updated_at only" ((JsonField $r.Body "projects[0]").PSObject.Properties.Name.Count -eq 5) "cols=$((JsonField $r.Body 'projects[0]').PSObject.Properties.Name -join ',')"

# ---- get single: full data ----
$r = Req "GET" "/api/projects/$id1" $null $cookieA
Check "get -> 200 with data round-trip" ($r.Status -eq 200 -and (JsonField $r.Body "project.data.values.bin-prefix") -eq "BIN ") "status=$($r.Status)"

# ---- patch ----
Start-Sleep -Milliseconds 30
$r = Req "PATCH" "/api/projects/$id1" @{ name = "Bin reset shelf A v2"; data = @{ meta = @{ version = 1; tool = "bin" }; values = @{ "bin-prefix" = "SHELF "; "bin-start" = "5" } } } $cookieA
Check "patch name+data -> 200" ($r.Status -eq 200 -and (JsonField $r.Body "project.name") -eq "Bin reset shelf A v2") "status=$($r.Status)"
$r2 = Req "GET" "/api/projects/$id1" $null $cookieA
Check "patch persisted + bumps list order" ((JsonField $r2.Body "project.data.values.bin-prefix") -eq "SHELF ")
$r3 = Req "GET" "/api/projects?limit=50" $null $cookieA
Check "patched project now first (newest updated)" ((JsonField $r3.Body "projects[0].id") -eq $id1) "first=$(JsonField $r3.Body 'projects[0].id')"
$r = Req "PATCH" "/api/projects/$id1" @{} $cookieA
Check "patch empty body -> 400" ($r.Status -eq 400) "status=$($r.Status)"

# ---- cross-user ownership: 404, never 403 ----
$r = Req "GET" "/api/projects/$id1" $null $cookieB
Check "cross-user get -> 404" ($r.Status -eq 404) "status=$($r.Status)"
$r = Req "PATCH" "/api/projects/$id1" @{ name = "hijack" } $cookieB
Check "cross-user patch -> 404" ($r.Status -eq 404) "status=$($r.Status)"
$r = Req "DELETE" "/api/projects/$id1" $null $cookieB
Check "cross-user delete -> 404" ($r.Status -eq 404) "status=$($r.Status)"

# ---- delete ----
$r = Req "DELETE" "/api/projects/$idT" $null $cookieA
Check "delete -> 200" ($r.Status -eq 200) "status=$($r.Status)"
$r = Req "GET" "/api/projects/$idT" $null $cookieA
Check "deleted project get -> 404" ($r.Status -eq 404) "status=$($r.Status)"

# ---- rate limit: 60 writes/hour per user (fresh user C; 60 pass, 61st 429) ----
$cookieC = Register "b5-c-$tag@bisket.com"
$okCount = 0; $saw429 = $false
for ($i = 1; $i -le 61; $i++) {
  $r = Req "POST" "/api/projects" @{ name = "rl $i"; tool = "fnsku"; data = @{ meta = @{ version = 1; tool = "fnsku" }; values = @{} } } $cookieC
  if ($r.Status -eq 200) { $okCount++ }
  elseif ($r.Status -eq 429) { $saw429 = $true; Check "rate limit: 61st write -> 429" ($i -eq 61) "at write $i, code=$(JsonField $r.Body 'error.code')"; break }
  else { Check "rate limit: unexpected status at write $i" $false "status=$($r.Status)"; break }
}
Check "rate limit: 60 writes passed then 429" ($okCount -eq 60 -and $saw429) "ok=$okCount saw429=$saw429"

Write-Output ""
if ($script:Failures) { Write-Output "$($script:Failures) FAILURE(S)"; exit 1 } else { Write-Output "ALL B5 PROJECTS TESTS PASSED"; exit 0 }
