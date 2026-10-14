$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\Legion\Documents\IC\website"
Set-Location $repoRoot

function Check-File {
    param($relPath)
    
    # Get HEAD version
    $headContent = git show "HEAD:$relPath" 2>$null
    $headBytes = [System.Text.Encoding]::UTF8.GetBytes($headContent)
    
    # Get working copy
    $wcBytes = [System.IO.File]::ReadAllBytes($relPath)
    
    Write-Host "`n=== $relPath ==="
    
    # 1. UTF-8 decode and BOM
    $pairs = @("HEAD", $headBytes), ("WORKING", $wcBytes)
    foreach ($pair in $pairs) {
        $label = $pair[0]
        $data = $pair[1]
        $hasBom = $data.Length -ge 3 -and $data[0] -eq 0xEF -and $data[1] -eq 0xBB -and $data[2] -eq 0xBF
        try {
            $text = [System.Text.Encoding]::UTF8.GetString($data)
            Write-Host ("  {0}: UTF-8 OK, BOM={1}, len={2} chars" -f $label, $hasBom, $text.Length)
        }
        catch {
            Write-Host ("  {0}: UTF-8 DECODE ERROR - {1}" -f $label, $_.Exception.Message)
        }
    }
    
    # 2. Line endings
    foreach ($pair in $pairs) {
        $label = $pair[0]
        $data = $pair[1]
        $crlf = 0
        for ($i = 0; $i -lt $data.Length - 1; $i++) {
            if ($data[$i] -eq 0x0D -and $data[$i+1] -eq 0x0A) { $crlf++ }
        }
        $lf = 0
        for ($i = 0; $i -lt $data.Length; $i++) {
            if ($data[$i] -eq 0x0A) { $lf++ }
        }
        $lf -= $crlf
        Write-Host ("  {0}: CRLF={1}, LF={2}" -f $label, $crlf, $lf)
    }
    
    # 3. Count U+0107 (ć) - using char code
    $cAcute = [char]0x0107
    foreach ($pair in $pairs) {
        $label = $pair[0]
        $data = $pair[1]
        $text = [System.Text.Encoding]::UTF8.GetString($data)
        $count = [System.Text.RegularExpressions.Regex]::Matches($text, $cAcute).Count
        Write-Host ("  {0}: U+0107 count = {1}" -f $label, $count)
    }
    
    # 4. Mojibake sequences - using char codes
    $mojibake = @{}
    # Lovcen corruption: \u00c4\u2021
    $mojibake["Lovcen corruption"] = [char]0x00C4 + [char]0x2021
    # € corruption: \u00e2\u201a\u00ac
    $mojibake["Euro corruption"] = [char]0x00E2 + [char]0x201A + [char]0x00AC
    # · corruption: \u00c2\u00b7
    $mojibake["Dot corruption"] = [char]0x00C2 + [char]0x00B7
    # generic \u00c3
    $mojibake["Generic A-tilde"] = [char]0x00C3
    
    foreach ($pair in $pairs) {
        $label = $pair[0]
        $data = $pair[1]
        $text = [System.Text.Encoding]::UTF8.GetString($data)
        Write-Host ("  {0} mojibake counts:" -f $label)
        foreach ($name in $mojibake.Keys) {
            $seq = $mojibake[$name]
            $c = [System.Text.RegularExpressions.Regex]::Matches($text, [System.Text.RegularExpressions.Regex]::Escape($seq)).Count
            if ($c -gt 0) { Write-Host ("    {0}: {1}" -f $name, $c) }
        }
    }
}

Check-File "frontend/index.html"
Check-File "frontend/schema.json"

# 5. git diff --stat comparison
Write-Host "`n=== git diff stats ==="
$stat1 = git diff --stat
$stat2 = git diff --stat --ignore-space-at-eol
Write-Host "Normal: $stat1"
Write-Host "Ignore eol: $stat2"