$tomlPath = "$env:APPDATA\xdg.config\.wrangler\config\default.toml"
if (Test-Path $tomlPath) {
    $content = Get-Content $tomlPath -Raw
    if ($content -match 'oauth_token\s*=\s*"([^"]+)"') {
        $token = $matches[1]
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = "application/json"
        }
        $accountId = "c83366f00d3ba3499548650f2e48475a"
        $projectName = "label-ninja"
        $url = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName/domains"
        $body = @{ name = "label-ninja.com" } | ConvertTo-Json

        try {
            $res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
            Write-Host "Cloudflare Domain API Response:" ($res | ConvertTo-Json -Depth 3)
        } catch {
            Write-Host "API Error Details:" $_.Exception.Message
            if ($_.Exception.Response) {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                Write-Host "Error Body:" $reader.ReadToEnd()
            }
        }
    }
}
