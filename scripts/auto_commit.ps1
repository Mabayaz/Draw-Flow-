$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Auto-commit watcher started for $repoRoot"
Write-Host "Changes are checked every 5 seconds. Press Ctrl+C to stop."

while ($true) {
  $status = git status --porcelain
  if ($status) {
    git add --all
    if (-not (git diff --cached --quiet)) {
      $message = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
      git commit -m $message
      if ($LASTEXITCODE -eq 0) {
        git push origin main
        if ($LASTEXITCODE -eq 0) {
          Write-Host "Changes pushed to origin/main; GitHub Pages deployment triggered."
        } else {
          Write-Warning "Commit succeeded, but the push failed. The next change will retry the push."
        }
      }
    }
  }

  Start-Sleep -Seconds 5
}