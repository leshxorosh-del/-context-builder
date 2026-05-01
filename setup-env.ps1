$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Copy-IfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$SourceFile,
    [Parameter(Mandatory = $true)][string]$TargetFile
  )

  if (-not (Test-Path $TargetFile)) {
    Copy-Item $SourceFile $TargetFile
    Write-Host "✅ Created: $TargetFile"
  } else {
    Write-Host "ℹ️  Exists: $TargetFile"
  }
}

# Keep root .env for docker-compose convenience.
# Корневой .env нужен для удобного docker-compose запуска.
Copy-IfMissing -SourceFile ".env.example" -TargetFile ".env"
Copy-IfMissing -SourceFile "backend/.env.example" -TargetFile "backend/.env"
Copy-IfMissing -SourceFile "frontend/.env.example" -TargetFile "frontend/.env"

Write-Host ""
Write-Host "⚠️  Файлы .env созданы из шаблонов. ОБЯЗАТЕЛЬНО отредактируйте backend/.env, добавив свои реальные ключи (OPENAI_API_KEY, JWT_SECRET)." -ForegroundColor Yellow
Write-Host "⚠️  .env files were generated from templates. You MUST edit backend/.env and add real keys (OPENAI_API_KEY, JWT_SECRET)." -ForegroundColor Yellow
