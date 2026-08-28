$html = [System.IO.File]::ReadAllText("C:\Code\label-ninja\public\index.html")
$sitemap = [System.IO.File]::ReadAllText("C:\Code\label-ninja\public\sitemap.xml")
$logoBytes = [System.IO.File]::ReadAllBytes("C:\Code\label-ninja\public\assets\logo.jpg")
$logoBase64 = [Convert]::ToBase64String($logoBytes)

$htmlJson = $html | ConvertTo-Json
$sitemapJson = $sitemap | ConvertTo-Json

$js = @"
const HTML_CONTENT = $htmlJson;
const SITEMAP_CONTENT = $sitemapJson;
const LOGO_BASE64 = "$logoBase64";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/assets/logo.jpg") {
      const binary = atob(LOGO_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Response(bytes.buffer, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    if (path === "/sitemap.xml") {
      return new Response(SITEMAP_CONTENT, {
        headers: {
          "content-type": "application/xml",
          "cache-control": "public, max-age=3600"
        }
      });
    }

    return new Response(HTML_CONTENT, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache"
      }
    });
  }
};
"@

[System.IO.File]::WriteAllText("C:\Code\label-ninja\src\index.js", $js)
Write-Host "src/index.js generated cleanly!"
