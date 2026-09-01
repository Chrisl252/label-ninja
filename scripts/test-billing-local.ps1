param(
  [string]$Base = "http://127.0.0.1:8787",
  [switch]$NoKey
)
# Brick 4 local verification: Stripe billing backend against a running `wrangler dev`.
# -Default run assumes .dev.vars present (fake keys): pricing degrade, checkout/portal guards,
#   the signed-webhook entitlement state machine, export regression, predicate sanity.
# -NoKey run assumes .dev.vars ABSENT (temporarily renamed): prod-shaped unconfigured checks.
# Webhook events are crafted + HMAC-signed locally with whsec_fake_local_secret (see Sign-Event).
$ErrorActionPreference = "Stop"

$script:Failures = 0
$WebhookSecret = "whsec_fake_local_secret"

function Req([string]$Method, [string]$Path, $Body, [string]$Cookie, [string]$StripeSig) {
  # curl.exe-based: PS 5.1's HttpClient silently drops Cookie headers set on HttpRequestMessage.
  $tag = [guid]::NewGuid().ToString('N').Substring(0, 8)
  $hf = "$env:TEMP\ln-b4-h-$tag.txt"
  $bf = "$env:TEMP\ln-b4-b-$tag.txt"
  $pf = "$env:TEMP\ln-b4-p-$tag.txt"
  $cArgs = @("-s", "-D", $hf, "-o", $bf, "-w", "%{http_code}", "-X", $Method, "$Base$Path")
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress -Depth 12 }
    [IO.File]::WriteAllText($pf, $json)
    $cArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$pf")
  }
  if ($Cookie) { $cArgs += @("-H", "Cookie: ln_session=$Cookie") }
  if ($StripeSig) { $cArgs += @("-H", "Stripe-Signature: $StripeSig") }
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
  try { $o = $jsonText | ConvertFrom-Json; foreach ($p in $path.Split('.')) { $o = $o.$p }; $o } catch { $null }
}

# NOTE: PowerShell parses `NowUnix + 3600` as command args, NOT arithmetic — always use
# the delta parameter (NowUnix 3600) / (NowUnix (-3600)), never +/- operators.
function NowUnix([int64]$delta = 0) { [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + $delta }

# Stripe-style signature: v1 = hex(HMAC-SHA256(secret, "t.body"))
function Sign-Event([string]$BodyJson, [int64]$Timestamp) {
  $hmac = New-Object System.Security.Cryptography.HMACSHA256
  $hmac.Key = [Text.Encoding]::UTF8.GetBytes($WebhookSecret)
  $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$Timestamp.$BodyJson"))
  $hex = ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
  "t=$Timestamp,v1=$hex"
}

function Post-Event([string]$BodyJson, [string]$Sig) {
  Req "POST" "/api/webhooks/stripe" $BodyJson $null $Sig
}

function ShowMe([string]$Cookie, [string]$Label) {
  $r = Req "GET" "/api/auth/me" $null $Cookie
  $u = JsonField $r.Body "user"
  $fu = JsonField $r.Body "user.free_uses"
  Write-Output ("ME    {0}: plan={1} status={2} paid_through={3} unlimited={4} remaining={5} consumed={6} [status={7}]" -f `
    $Label, $u.plan, $u.subscription.status, $u.subscription.paid_through, $fu.unlimited, $fu.remaining, $fu.consumed, $r.Status)
  $r
}

# Minimal 1-page export spec (same shape as test-export-local.ps1 fixtures).
function TinySpec([string]$key) {
  ('{"idempotency_key":"' + $key + '","tool":"bin","format":"pdf","settings":{},"pages":[' +
    '{"width_in":4,"height_in":6,"orientation":"portrait","elements":[' +
    '{"type":"text","x_in":0.2,"y_in":0.3,"w_in":3.6,"text":"B4 REGRESSION","font_size_pt":18,"bold":true},' +
    '{"type":"barcode","subtype":"code128","value":"B4-01","x_in":0.4,"y_in":2.2,"w_in":3.2,"h_in":0.9,"show_text":true}]}]}')
}

$r = Req "GET" "/api/health" $null $null
if ($r.Status -ne 200) { Write-Output "FATAL: wrangler dev not healthy at $Base (status=$($r.Status))"; exit 1 }

if ($NoKey) {
  # ===== Phase A: NO .dev.vars — prod-shaped unconfigured behavior =====
  $r = Req "GET" "/api/config/pricing" $null $null
  $errField = JsonField $r.Body "error"
  Check "A1 pricing no keys -> 200 {ok:true,configured:false}, no error field" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true -and (JsonField $r.Body "configured") -eq $false -and $null -eq $errField) "status=$($r.Status) body=$($r.Body)"
  $r = Req "POST" "/api/billing/checkout" '{"plan":"monthly"}' $null
  Check "A2 checkout unauth (no keys) -> 401" ($r.Status -eq 401 -and (JsonField $r.Body "error.code") -eq 'unauthorized') "status=$($r.Status) body=$($r.Body)"
  $r = Req "POST" "/api/webhooks/stripe" '{"id":"evt_x","type":"payout.created","data":{"object":{}}}' $null 't=123,v1=deadbeef'
  Check "A3 webhook unsigned/garbage (no secret) -> 400 invalid_signature" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'invalid_signature') "status=$($r.Status) body=$($r.Body)"
  Write-Output ("RESULT failures={0}" -f $script:Failures)
  if ($script:Failures -gt 0) { exit 1 } else { exit 0 }
}

# ===== Phase B: .dev.vars present (fake keys) =====
& npx wrangler d1 execute label-ninja-db --local --command "DELETE FROM rate_limits" | Out-Null
$ts = Get-Date -Format "yyyyMMddHHmmss"
$password = "local-test-pass-123"

# ---- Group 1: pricing degrade under fake key ----
$r = Req "GET" "/api/config/pricing" $null $null
Check "1a pricing fake key -> 200 ok configured:false error=price_fetch_failed" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true -and (JsonField $r.Body "configured") -eq $false -and (JsonField $r.Body "error") -eq 'price_fetch_failed') "status=$($r.Status) body=$($r.Body)"

# ---- Group 2+3: checkout / portal guards (user 1: no stripe customer) ----
$email1 = "ln-b4-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email1; password = $password } | ConvertTo-Json) $null
$c1 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$uid1 = JsonField $r.Body "user.id"

$r = Req "POST" "/api/billing/checkout" '{"plan":"monthly"}' $null
Check "2a checkout no auth -> 401 unauthorized" ($r.Status -eq 401 -and (JsonField $r.Body "error.code") -eq 'unauthorized') "status=$($r.Status) body=$($r.Body)"
$r = Req "POST" "/api/billing/checkout" '{"plan":"weekly"}' $c1
Check "2b checkout invalid plan -> 400 invalid_plan" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'invalid_plan') "status=$($r.Status) body=$($r.Body)"
$r = Req "POST" "/api/billing/checkout" '{"plan":"monthly"}' $c1
Check "2c checkout fake key -> graceful 502 stripe_upstream_error (no stack)" ($r.Status -eq 502 -and (JsonField $r.Body "error.code") -eq 'stripe_upstream_error') "status=$($r.Status) body=$($r.Body)"
$r = Req "POST" "/api/billing/portal" '{}' $null
Check "3a portal no auth -> 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Req "POST" "/api/billing/portal" '{}' $c1
Check "3b portal no customer -> 400 no_customer" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'no_customer') "status=$($r.Status) body=$($r.Body)"

# ---- Group 4: webhook entitlement state machine (user 2) ----
$email2 = "ln-b4-wh-$ts@bisket.com"
$r = Req "POST" "/api/auth/register" (@{ email = $email2; password = $password } | ConvertTo-Json) $null
$c2 = if ($r.SetCookie -match 'ln_session=([0-9a-f]{64})') { $Matches[1] } else { $null }
$uid2 = JsonField $r.Body "user.id"
$subId = 'sub_test_' + $ts
$cusId = 'cus_test_' + $ts
ShowMe $c2 "start" | Out-Null

# 4a: checkout.session.completed (binds customer; sub fetch defers under fake key) + subscription active +30d -> pro
$evtA1 = '{"id":"evt_' + $ts + '_a1","type":"checkout.session.completed","data":{"object":{"id":"cs_test_1","object":"checkout_session","customer":"' + $cusId + '","subscription":"' + $subId + '","client_reference_id":"' + $uid2 + '","metadata":{"user_id":"' + $uid2 + '"}}}}'
$r = Post-Event $evtA1 (Sign-Event $evtA1 (NowUnix))
Check "4a1 checkout.session.completed -> 200 customer bound" ($r.Status -eq 200 -and (JsonField $r.Body "ok") -eq $true) "status=$($r.Status) body=$($r.Body)"
$evtA2 = '{"id":"evt_' + $ts + '_a2","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"active","current_period_end":' + (NowUnix 2592000) + '}}}'
$r = Post-Event $evtA2 (Sign-Event $evtA2 (NowUnix))
Check "4a2 subscription active +30d -> 200 ok" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'ok') "status=$($r.Status) body=$($r.Body)"
$r = ShowMe $c2 "4a after-active"
Check "4a3 me -> plan=pro unlimited=true remaining=null" ((JsonField $r.Body "user.plan") -eq 'pro' -and (JsonField $r.Body "user.free_uses.unlimited") -eq $true -and $null -eq (JsonField $r.Body "user.free_uses.remaining")) "plan=$(JsonField $r.Body 'user.plan') unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"

# 4b: duplicate event id -> duplicate:true, state unchanged
$r = Post-Event $evtA1 (Sign-Event $evtA1 (NowUnix))
Check "4b1 duplicate evt_b4_a1 -> 200 duplicate:true" ($r.Status -eq 200 -and (JsonField $r.Body "duplicate") -eq $true) "status=$($r.Status) body=$($r.Body)"
$r = ShowMe $c2 "4b duplicate"
Check "4b2 state unchanged (still pro active)" ((JsonField $r.Body "user.plan") -eq 'pro' -and (JsonField $r.Body "user.subscription.status") -eq 'active') "plan=$(JsonField $r.Body 'user.plan') status=$(JsonField $r.Body 'user.subscription.status')"

# 4c: canceled with future period end (+15d) -> access RETAINED (the spec rule)
$evtC = '{"id":"evt_' + $ts + '_c","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"canceled","current_period_end":' + (NowUnix 1296000) + '}}}'
$r = Post-Event $evtC (Sign-Event $evtC (NowUnix))
Check "4c1 canceled +15d -> 200 ok" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'ok') "status=$($r.Status) body=$($r.Body)"
$r = ShowMe $c2 "4c canceled-future"
Check "4c2 paid-through access retained: plan=pro unlimited=true status=canceled" ((JsonField $r.Body "user.plan") -eq 'pro' -and (JsonField $r.Body "user.subscription.status") -eq 'canceled' -and (JsonField $r.Body "user.free_uses.unlimited") -eq $true) "plan=$(JsonField $r.Body 'user.plan') status=$(JsonField $r.Body 'user.subscription.status') unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"

# 4d: canceled with PAST period end -> access ends, free uses intact
$evtD = '{"id":"evt_' + $ts + '_d","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"canceled","current_period_end":' + (NowUnix (-86400)) + '}}}'
$r = Post-Event $evtD (Sign-Event $evtD (NowUnix))
Check "4d1 canceled -1d -> 200 ok" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'ok') "status=$($r.Status) body=$($r.Body)"
$r = ShowMe $c2 "4d canceled-past"
$fuD = JsonField $r.Body "user.free_uses"
Check "4d2 access ended: plan=free unlimited=false consumed=0 remaining=10" ((JsonField $r.Body "user.plan") -eq 'free' -and $fuD.unlimited -eq $false -and $fuD.consumed -eq 0 -and $fuD.remaining -eq 10) "plan=$(JsonField $r.Body 'user.plan') free_uses=$(($fuD | ConvertTo-Json -Compress))"

# 4e: re-up active, then invoice.payment_failed -> past_due with FUTURE paid_through -> access retained
$evtE1 = '{"id":"evt_' + $ts + '_e1","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"active","current_period_end":' + (NowUnix 2592000) + '}}}'
$r = Post-Event $evtE1 (Sign-Event $evtE1 (NowUnix))
Check "4e1 re-up active +30d -> 200" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'ok') "status=$($r.Status) body=$($r.Body)"
$evtE2 = '{"id":"evt_' + $ts + '_e2","type":"invoice.payment_failed","data":{"object":{"id":"in_test_1","object":"invoice","customer":"' + $cusId + '","subscription":"' + $subId + '"}}}'
$r = Post-Event $evtE2 (Sign-Event $evtE2 (NowUnix))
Check "4e2 invoice.payment_failed -> 200 ok" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'ok') "status=$($r.Status) body=$($r.Body)"
$r = ShowMe $c2 "4e payment-failed"
Check "4e3 past_due + future paid_through -> unlimited retained" ((JsonField $r.Body "user.subscription.status") -eq 'past_due' -and (JsonField $r.Body "user.free_uses.unlimited") -eq $true) "status=$(JsonField $r.Body 'user.subscription.status') unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"

# 4f: tampered signature -> 400 invalid_signature
$evtF = '{"id":"evt_' + $ts + '_f","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"active","current_period_end":' + (NowUnix 2592000) + '}}}'
$sigF = Sign-Event $evtF (NowUnix)
$sigTampered = $sigF.Substring(0, $sigF.Length - 2) + ($(if ($sigF.EndsWith("00")) { "11" } else { "00" }))
$r = Post-Event $evtF $sigTampered
Check "4f tampered v1 -> 400 invalid_signature" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'invalid_signature') "status=$($r.Status) body=$($r.Body)"

# 4g: old timestamp -> 400
$r = Post-Event $evtF (Sign-Event $evtF (NowUnix (-3600)))
Check "4g stale t=now-3600 -> 400 invalid_signature" ($r.Status -eq 400 -and (JsonField $r.Body "error.code") -eq 'invalid_signature') "status=$($r.Status) body=$($r.Body)"

# 4h: customer mismatch — signed event binding a DIFFERENT customer to the same user -> ignored
$evtH = '{"id":"evt_' + $ts + '_h","type":"checkout.session.completed","data":{"object":{"id":"cs_test_2","object":"checkout_session","customer":"cus_EVIL_999","subscription":"' + $subId + '","client_reference_id":"' + $uid2 + '","metadata":{"user_id":"' + $uid2 + '"}}}}'
$r = Post-Event $evtH (Sign-Event $evtH (NowUnix))
Check "4h1 mismatched customer -> 200 customer_mismatch_ignored" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'customer_mismatch_ignored') "status=$($r.Status) body=$($r.Body)"
$bound = (& npx wrangler d1 execute label-ninja-db --local --command ("SELECT stripe_customer_id, subscription_status FROM users WHERE id='" + $uid2 + "'") --json | ConvertFrom-Json).results[0]
Check "4h2 user row unchanged (still $cusId, still past_due)" ($bound.stripe_customer_id -eq $cusId -and $bound.subscription_status -eq 'past_due') "row=$(($bound | ConvertTo-Json -Compress))"

# 4i: unknown user -> 200 no_matching_user
$evtI = '{"id":"evt_' + $ts + '_i","type":"checkout.session.completed","data":{"object":{"id":"cs_test_3","object":"checkout_session","customer":"cus_test_321","subscription":"sub_test_3","client_reference_id":"no-such-user","metadata":{"user_id":"no-such-user"}}}}'
$r = Post-Event $evtI (Sign-Event $evtI (NowUnix))
Check "4i unknown user -> 200 no_matching_user" ($r.Status -eq 200 -and (JsonField $r.Body "result") -eq 'no_matching_user') "status=$($r.Status) body=$($r.Body)"

# ---- Group 5: export regression — free consumes, pro does not ----
$evtFree = '{"id":"evt_' + $ts + '_free","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"canceled","current_period_end":' + (NowUnix (-86400)) + '}}}'
$r = Post-Event $evtFree (Sign-Event $evtFree (NowUnix))
Check "5a flip free via webhook -> 200" ($r.Status -eq 200) "status=$($r.Status)"
$r = Req "POST" "/api/export" (TinySpec "b4-$ts-free") $c2
Check "5b free export -> 200, remaining=9 (consumes)" ($r.Status -eq 200 -and (JsonField $r.Body "remaining_free_uses") -eq 9) "status=$($r.Status) remaining=$(JsonField $r.Body 'remaining_free_uses')"
$evtPro = '{"id":"evt_' + $ts + '_pro","type":"customer.subscription.updated","data":{"object":{"id":"' + $subId + '","object":"subscription","customer":"' + $cusId + '","status":"active","current_period_end":' + (NowUnix 2592000) + '}}}'
$r = Post-Event $evtPro (Sign-Event $evtPro (NowUnix))
Check "5c flip pro via webhook -> 200" ($r.Status -eq 200) "status=$($r.Status)"
$r = Req "POST" "/api/export" (TinySpec "b4-$ts-pro") $c2
Check "5d pro export -> 200, remaining=null (no consumption)" ($r.Status -eq 200 -and $null -eq (JsonField $r.Body "remaining_free_uses")) "status=$($r.Status) remaining=$(JsonField $r.Body 'remaining_free_uses')"
$r = ShowMe $c2 "5e final"
Check "5e ledger unchanged by pro export: consumed=1" ((JsonField $r.Body "user.free_uses.consumed") -eq 1 -and (JsonField $r.Body "user.free_uses.unlimited") -eq $true) "consumed=$(JsonField $r.Body 'user.free_uses.consumed')"

# ---- Group 6: entitlement predicate unit sanity (B2 bonus path, on user 1) ----
& npx wrangler d1 execute label-ninja-db --local --command ("UPDATE users SET plan='pro', subscription_status='active', paid_through=NULL WHERE id='" + $uid1 + "'") | Out-Null
$r = ShowMe $c1 "6a pro+active"
Check "6a plan=pro status=active -> unlimited (B2 bonus path)" ((JsonField $r.Body "user.free_uses.unlimited") -eq $true) "unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"
$futureMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 604800000
& npx wrangler d1 execute label-ninja-db --local --command ("UPDATE users SET subscription_status='canceled', paid_through=" + $futureMs + " WHERE id='" + $uid1 + "'") | Out-Null
$r = ShowMe $c1 "6b canceled-future"
Check "6b canceled + paid_through future -> unlimited" ((JsonField $r.Body "user.free_uses.unlimited") -eq $true) "unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"
$pastMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 604800000
& npx wrangler d1 execute label-ninja-db --local --command ("UPDATE users SET paid_through=" + $pastMs + " WHERE id='" + $uid1 + "'") | Out-Null
$r = ShowMe $c1 "6c canceled-past"
Check "6c canceled + paid_through past -> not unlimited" ((JsonField $r.Body "user.free_uses.unlimited") -eq $false) "unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"
& npx wrangler d1 execute label-ninja-db --local --command ("UPDATE users SET subscription_status='incomplete', paid_through=" + $futureMs + " WHERE id='" + $uid1 + "'") | Out-Null
$r = ShowMe $c1 "6d incomplete"
Check "6d incomplete never grants (even with future paid_through)" ((JsonField $r.Body "user.free_uses.unlimited") -eq $false) "unlimited=$(JsonField $r.Body 'user.free_uses.unlimited')"

Write-Output ("RESULT failures={0}" -f $script:Failures)
if ($script:Failures -gt 0) { exit 1 } else { exit 0 }
