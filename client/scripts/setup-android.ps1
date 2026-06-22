# Run once after `npm install` in client/ (requires Android Studio + free disk space)

Set-Location $PSScriptRoot\..

Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building web assets..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "android")) {
  Write-Host "Adding Android platform..." -ForegroundColor Cyan
  npx cap add android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "Android folder exists — syncing..." -ForegroundColor Cyan
  npx cap sync android
}

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  1. Set VITE_API_BASE_URL in .env.production to your Render API URL"
Write-Host "  2. npm run build:mobile"
Write-Host "  3. npm run android:open"
Write-Host "  4. See docs/GOOGLE_PLAY.md for Play Console submission"
