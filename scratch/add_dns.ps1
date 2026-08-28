$tomlPath = "$env:APPDATA\xdg.config\.wrangler\config\default.toml"
if (Test-Path $tomlPath) {
    $content = Get-Content $tomlPath -Raw
    if ($content -match 'oauth_token\s*=\s*"([^"]+)"') {
        $token = $matches[1]
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = "application/json"
        }
        $zoneId = "38095a49027166356931acf44ad9cb67"
        $dnsUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"

        # CNAME @ -> label-ninja.pages.dev
        $body1 = @{
            type    = "CNAME"
            name    = "@"
            content = "label-ninja.pages.dev"
            proxied = $true
        } | ConvertTo-Json

        try {
            $res1 = Invoke-RestMethod -Uri $dnsUrl -Method Post -Headers $headers -Body $body1
            Write-Host "DNS Root CNAME Created:" ($res1 | ConvertTo-Json -Depth 2)
        } catch {
            Write-Host "DNS Root Error:" $_.Exception.Message
        }

        # CNAME www -> label-ninja.pages.dev
        $body2 = @{
            type    = "CNAME"
            name    = "www"
            content = "label-ninja.pages.dev"
            proxied = $true
        } | ConvertTo-Json

        try {
            $res2 = Invoke-RestMethod -Uri $dnsUrl -Method Post -Headers $headers -Body $body2
            Write-Host "DNS WWW CNAME Created:" ($res2 | ConvertTo-Json -Depth 2)
        } catch {
            Write-Host "DNS WWW Error:" $_.Exception.Message
        }
    }
}
