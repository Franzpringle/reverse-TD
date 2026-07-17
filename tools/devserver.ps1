param(
  [int]$Port = 8642,
  [string]$Root = (Resolve-Path "$PSScriptRoot\..").Path
)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Output "Serving $Root on http://127.0.0.1:$Port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".json" = "application/json"
  ".svg"  = "image/svg+xml"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $localPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

      if ($req.HttpMethod -eq "POST" -and $localPath -eq "/report") {
        $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
        $body = $reader.ReadToEnd()
        [System.IO.File]::WriteAllText((Join-Path $Root "tools\report.txt"), $body)
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.StatusCode = 200
        $ok = [System.Text.Encoding]::UTF8.GetBytes("ok")
        $res.OutputStream.Write($ok, 0, $ok.Length)
      } elseif ($req.HttpMethod -eq "POST" -and $localPath -eq "/screenshot") {
        $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
        $body = $reader.ReadToEnd()
        $name = $req.QueryString["name"]
        if (-not $name) { $name = "shot" }
        $b64 = $body -replace '^data:image/png;base64,', ''
        $bytes = [System.Convert]::FromBase64String($b64)
        [System.IO.File]::WriteAllBytes((Join-Path $Root "tools\$name.png"), $bytes)
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.StatusCode = 200
        $ok = [System.Text.Encoding]::UTF8.GetBytes("ok")
        $res.OutputStream.Write($ok, 0, $ok.Length)
      } elseif ($req.HttpMethod -eq "POST" -and $localPath -eq "/save-html") {
        $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
        $body = $reader.ReadToEnd()
        $name = $req.QueryString["name"]
        if (-not $name) { $name = "snapshot" }
        [System.IO.File]::WriteAllText((Join-Path $Root "tools\$name.html"), $body)
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.StatusCode = 200
        $ok = [System.Text.Encoding]::UTF8.GetBytes("ok")
        $res.OutputStream.Write($ok, 0, $ok.Length)
      } else {
        if ($localPath -eq "/") { $localPath = "/index.html" }
        $filePath = Join-Path $Root ($localPath.TrimStart('/'))
        $filePath = $filePath -replace '/', '\'

        if (Test-Path $filePath -PathType Leaf) {
          $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
          $contentType = $mime[$ext]
          if (-not $contentType) { $contentType = "application/octet-stream" }
          $bytes = [System.IO.File]::ReadAllBytes($filePath)
          $res.ContentType = $contentType
          $res.ContentLength64 = $bytes.Length
          $res.StatusCode = 200
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
          $res.StatusCode = 404
          $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $localPath")
          $res.OutputStream.Write($msg, 0, $msg.Length)
        }
      }
    } catch {
      $res.StatusCode = 500
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Server error: $($_.Exception.Message)")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
