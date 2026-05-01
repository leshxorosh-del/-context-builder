$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "docker")) {
  Write-Host "❌ Docker не найден. Установите Docker Desktop: https://www.docker.com/get-started" -ForegroundColor Red
  exit 1
}

$composeArgs = @()
try {
  docker compose version | Out-Null
  $composeArgs = @("compose")
} catch {
  if (Test-Command "docker-compose") {
    $composeArgs = @()
  } else {
    Write-Host "❌ Docker Compose не найден. Установите Docker Desktop с Compose." -ForegroundColor Red
    exit 1
  }
}

function Invoke-Compose {
  param([string[]]$Args)
  if ($composeArgs.Count -gt 0) {
    & docker @composeArgs @Args
  } else {
    & docker-compose @Args
  }
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "⚠️  Создан .env из .env.example" -ForegroundColor Yellow
  Write-Host "   Перед прод-использованием добавьте OPENAI_API_KEY в .env"
}

Write-Host "🚀 Запускаю сервисы..."
Invoke-Compose -Args @("up", "-d", "--build")

function Wait-Http {
  param(
    [string]$Name,
    [string]$Url,
    [int]$Retries = 72,
    [int]$DelaySeconds = 5
  )

  Write-Host "⏳ Ожидание $Name ($Url)..."
  for ($i = 1; $i -le $Retries; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        Write-Host "✅ $Name готов" -ForegroundColor Green
        return $true
      }
    } catch {
      # keep waiting
    }
    Start-Sleep -Seconds $DelaySeconds
  }

  Write-Host "❌ $Name не поднялся вовремя" -ForegroundColor Red
  return $false
}

$frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }

[void](Wait-Http -Name "Backend" -Url "http://localhost:3001/health")
[void](Wait-Http -Name "Frontend" -Url "http://localhost:$frontendPort/health")
[void](Wait-Http -Name "Neo4j Browser" -Url "http://localhost:7474")

Write-Host ""
Write-Host "🎉 Context Builder локально запущен"
Write-Host "   Frontend:      http://localhost:$frontendPort"
Write-Host "   Backend API:   http://localhost:3001"
Write-Host "   Neo4j Browser: http://localhost:7474"
Write-Host ""
Write-Host "Если backend не healthy, выполните миграции вручную:"
if ($composeArgs.Count -gt 0) {
  Write-Host "   docker compose exec backend npm run migrate:prod"
  Write-Host "   docker compose exec backend npm run neo4j:init"
} else {
  Write-Host "   docker-compose exec backend npm run migrate:prod"
  Write-Host "   docker-compose exec backend npm run neo4j:init"
}
