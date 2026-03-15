# test-all.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING ALL API ENDPOINTS - http://localhost:3001" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. HEALTH CHECK
Write-Host "
1. 🔍 HEALTH CHECK" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri http://localhost:3001/api/health
    Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "✅ DB Connected: $($health.dbConnected)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# 2. GET ALL BRANCHES
Write-Host "
2. 📊 GET ALL BRANCHES" -ForegroundColor Yellow
try {
    $branches = Invoke-RestMethod -Uri http://localhost:3001/api/branches
    Write-Host "✅ Total Branches: $($branches.Count)" -ForegroundColor Green
    $branches | Select-Object id, name, bm_name, total_collection | Format-Table
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}
