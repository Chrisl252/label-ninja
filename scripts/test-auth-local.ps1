param([string]$Base = "http://127.0.0.1:8787")
# Local verification of the Label Ninja auth API against a running `wrangler dev`.
$ErrorActionPreference = "Stop"

$script:Failures = 0

function Req([string]$Method, [string]$Path, $Body, [string]$Cookie) {
  # curl.exe-based: PS 5.1's HttpClient silently drops Cookie headers set on HttpRequestMessage.
  $hf = "$env:TEMP\ln-test-headers.txt"
  $bf = "$env:TEMP\ln-test-body.txt"
  $payloadFile = "$env:TEMP\ln-test-payload.txt"
  $cArgs = @("-s", "-D", $hf, "-o", $bf, "-w", "%{http_code}", "-X", $Method, "$Base$Path")
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress }
    [IO.File]::WriteAllText($payloadFile, $json)
    $cArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$payloadFile")
  }
  if ($Cookie) { $cArgs += @("-H", "Cookie: ln_session=$Cookie") }
  $status = [int](& curl.exe @cArgs)
  $bodyText = [IO.File]::ReadAllText($bf)
  $headers = Get-Content $hf -ErrorAction SilentlyContinue
  $setCookie = ($headers | Where-Object { $_ -like "Set-Cookie:*ln_session*" }) -join " | "
  $retryAfter = (($headers | Where-Object { $_ -like "Retry-After:*" }) -replace "Retry-After:\s*", "") -join ","
  [PSCustomObject]@{ Status = $status; Body = $bodyText; SetCookie = $setCookie; RetryAfter = $retryAfter }
}

function Check([string]$Name, [bool]$Pass, [string]$Detail = "") {
  if ($Pass) { Write-Output ("PASS  {0}  [{1}]" -f $Name, $Detail) }
  else { $script:Failures++; Write-Output ("FAIL  {0}  [{1}]" -f $Name, $Detail) }
}

function JsonField($jsonText, [string]$path) {
  try { $o = $jsonText | ConvertFrom-Json; foreach ($p in $path.Split('.')) { $o = $o.$p }; $o } catch { $null }
}

$ts = Get-Date -Format "yyyyMMddHHmmss"
$email = "ln-test-$ts@bisket.com"
$password = "local-test-pass-123"
$password2 = "local-test-pass-456"

# --- Phase A: functional flow (stays within the 10/hour auth rate limit) ---

$r = Req "GET" "/api/health" $null $null
Check "health 200 db:true" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true -and (JsonField $r.Body "db") -eq $true) "status=$($r.Status) body=$($r.Body)"

$r = Req "GET" "/api/auth/me" $null $null
Check "me(no cookie) 401 unauthorized" ($r.Status -eq 401 -and (JsonField $r.Body "error.code") -eq "unauthorized") "status=$($r.Status) body=$($r.Body)"

$big = '{"email":"' + ("x" * 110000) + '"}'
$r = Req "POST" "/api/auth/register" $big $null
Check "register oversized body 413" ($r.Status -eq 413 -and (JsonField $r.Body "error.code") -eq "payload_too_large") "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/register" "{not json" $null
Check "register bad JSON 400" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq "invalid_json") "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/register" @{ email = $email; password = $password } $null
$cookieOk = $r.SetCookie -match "ln_session=[0-9a-f]{64}" -and $r.SetCookie -match "HttpOnly" -and $r.SetCookie -match "Secure" -and $r.SetCookie -match "SameSite=Lax"
Check "register 200 + user + cookie flags" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true -and (JsonField $r.Body "user.email") -eq $email -and (JsonField $r.Body "user.role") -eq "user" -and $cookieOk) "status=$($r.Status) setCookie=$($r.SetCookie)"
$cookie = if ($r.SetCookie -match "ln_session=([0-9a-f]{64})") { $Matches[1] } else { $null }

$r = Req "GET" "/api/auth/me" $null $cookie
$fu = JsonField $r.Body "user.free_uses"
Check "me free_uses granted=10 consumed=0 remaining=10" ($r.Status -eq 200 -and $fu.granted -eq 10 -and $fu.consumed -eq 0 -and $fu.remaining -eq 10 -and $fu.unlimited -eq $false) "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/login" @{ email = $email; password = "wrong-password-xx" } $null
Check "login wrong password 401 invalid_credentials" ($r.Status -eq 401 -and (JsonField $r.Body "error.code") -eq "invalid_credentials") "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/login" @{ email = $email.ToUpper(); password = $password } $null
Check "login correct (uppercase email) 200" ($r.Status -eq 200 -and (JsonField $r.Body "user.email") -eq $email) "status=$($r.Status)"

$r = Req "POST" "/api/auth/register" @{ email = $email; password = $password } $null
Check "duplicate register 409 email_exists" ($r.Status -eq 409 -and (JsonField $r.Body "error.code") -eq "email_exists") "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/register" @{ email = "short-$ts@bisket.com"; password = "short" } $null
Check "register short password 400" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq "validation_error") "status=$($r.Status) body=$($r.Body)"

$r = Req "POST" "/api/auth/reset-request" @{ email = $email } $null
Check "reset-request generic 200 (no enumeration)" ($r.Status -eq 200 -and (JsonField $r.Body "message") -like "If an account exists*") "status=$($r.Status) body=$($r.Body)"

$resetToken = $null
$deadline = (Get-Date).AddSeconds(10)
while (-not $resetToken -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  $line = Select-String -Path "$PSScriptRoot\..\dev-local.log" -Pattern "RESET-LINK.*token=([0-9a-f]{96})" -ErrorAction SilentlyContinue | Select-Object -Last 1
  if ($line -and $line.Matches.Count -gt 0) { $resetToken = $line.Matches[0].Groups[1].Value }
}
if ($resetToken) {
  $r = Req "POST" "/api/auth/reset-confirm" @{ token = $resetToken; new_password = $password2 } $null
  Check "reset-confirm real token (from dev log) 200" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true) "status=$($r.Status) body=$($r.Body)"
} else {
  Check "reset-confirm real token 200" $false "no [RESET-LINK] line found in dev-local.log"
}

$r = Req "GET" "/api/auth/me" $null $cookie
Check "old cookie 401 after password reset" ($r.Status -eq 401) "status=$($r.Status)"

$r = Req "POST" "/api/auth/login" @{ email = $email; password = $password2 } $null
Check "login with new password 200" ($r.Status -eq 200) "status=$($r.Status)"
$newCookie = if ($r.SetCookie -match "ln_session=([0-9a-f]{64})") { $Matches[1] } else { $null }

$r = Req "POST" "/api/auth/logout" $null $newCookie
Check "logout 200" ($r.Status -eq 200) "status=$($r.Status) setCookie=$($r.SetCookie)"
$r = Req "GET" "/api/auth/me" $null $newCookie
Check "me after logout 401" ($r.Status -eq 401) "status=$($r.Status)"

$r = Req "GET" "/api/bogus" $null $null
Check "unknown /api path 404 not_found" ($r.Status -eq 404 -and (JsonField $r.Body "error.code") -eq "not_found") "status=$($r.Status) body=$($r.Body)"

$r = Req "DELETE" "/api/auth/me" $null $null
Check "wrong-method /api route 404 not_found" ($r.Status -eq 404 -and (JsonField $r.Body "error.code") -eq "not_found") "status=$($r.Status) body=$($r.Body)"

$r = Req "GET" "/" $null $null
Check "GET / static 200 html" ($r.Status -eq 200 -and $r.Body -match "(?i)<!doctype html|<html") "status=$($r.Status) bytes=$($r.Body.Length)"

# --- Phase B: rate limiting (fresh window after clearing the local counter) ---

& npx wrangler d1 execute label-ninja-db --local --command "DELETE FROM rate_limits" | Out-Null

$r = Req "POST" "/api/auth/reset-confirm" @{ token = ("0" * 96); new_password = "another-pass-999" } $null
Check "reset-confirm well-formed garbage token 400 invalid_token" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq "invalid_token") "status=$($r.Status) body=$($r.Body)"

for ($i = 1; $i -le 9; $i++) { $r = Req "POST" "/api/auth/login" @{ email = $email; password = "wrong-password-xx" } $null }
Check "login attempts 2-10 stay 401 (at limit, not over)" ($r.Status -eq 401) "status=$($r.Status)"
$r = Req "POST" "/api/auth/login" @{ email = $email; password = "wrong-password-xx" } $null
Check "11th auth hit 429 rate_limited + Retry-After" ($r.Status -eq 429 -and (JsonField $r.Body "error.code") -eq "rate_limited" -and $r.RetryAfter) "status=$($r.Status) retryAfter=$($r.RetryAfter) body=$($r.Body)"

$r = Req "GET" "/api/health" $null $null
Check "health still 200 after 429s" ($r.Status -eq 200 -and (JsonField $r.Body "db") -eq $true) "status=$($r.Status)"

Write-Output ("RESULT failures={0}" -f $script:Failures)
if ($script:Failures -gt 0) { exit 1 } else { exit 0 }
