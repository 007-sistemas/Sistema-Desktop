# Script para limpar e fazer build como admin
$log = "C:\Users\PcGabriel\Downloads\Sistema Bypass offline\build-fix.log"
Add-Content -Path $log -Value "=== Build Fix: $(Get-Date) ==="

try {
  Add-Content -Path $log -Value "Terminando processos DigitAll..."
  taskkill /F /IM DigitAll.exe /T 2>&1 | Out-File -Append $log
  Start-Sleep -Seconds 2

  Add-Content -Path $log -Value "Removendo dist_electron..."
  Remove-Item -LiteralPath "C:\Users\PcGabriel\Downloads\Sistema Bypass offline\dist_electron" -Recurse -Force -ErrorAction SilentlyContinue 2>&1 | Out-File -Append $log

  Add-Content -Path $log -Value "Iniciando npm run electron:build..."
  Push-Location "C:\Users\PcGabriel\Downloads\Sistema Bypass offline"
  npm run electron:build 2>&1 | Tee-Object -FilePath $log -Append
  Pop-Location

  Add-Content -Path $log -Value "Build completo. Código: $LASTEXITCODE"
} catch {
  Add-Content -Path $log -Value "ERRO: $($_.Exception.Message)"
}

Add-Content -Path $log -Value "=== Fim: $(Get-Date) ==="
