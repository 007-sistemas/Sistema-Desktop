# Script para ser executado como Administrador
# Uso: clique direito -> "Executar com PowerShell" ou execute via prompt elevado
$log = "C:\Users\PcGabriel\Downloads\Sistema Bypass offline\build-admin.log"
Add-Content -Path $log -Value "=== Início: $(Get-Date) ==="
try {
  Add-Content -Path $log -Value "Parando processos comuns..."
  taskkill /F /IM DigitAll.exe /T 2>&1 | Out-File -Append $log -ErrorAction SilentlyContinue
  taskkill /F /IM electron.exe /T 2>&1 | Out-File -Append $log -ErrorAction SilentlyContinue
  taskkill /F /IM node.exe /T 2>&1 | Out-File -Append $log -ErrorAction SilentlyContinue

  Start-Sleep -Seconds 1

  $unpacked = "C:\Users\PcGabriel\Downloads\Sistema Bypass offline\dist_electron\win-unpacked"
  if (Test-Path $unpacked) {
    Add-Content -Path $log -Value "Assumindo propriedade e concedendo permissões..."
    takeown /F "$unpacked" /R /D Y 2>&1 | Out-File -Append $log
    icacls "$unpacked" /grant "$env:USERNAME`:F" /T /C 2>&1 | Out-File -Append $log

    Add-Content -Path $log -Value "Tentando remover pasta dist_electron..."
    Remove-Item -LiteralPath "C:\Users\PcGabriel\Downloads\Sistema Bypass offline\dist_electron" -Recurse -Force -ErrorAction Stop 2>&1 | Out-File -Append $log
    Add-Content -Path $log -Value "Remoção bem-sucedida"
  } else {
    Add-Content -Path $log -Value "Pasta dist_electron não existe, nada a remover"
  }

  # Limpar cache do electron-builder (opcional, evita reuso de arquivos corrompidos)
  $cache = "$env:LOCALAPPDATA\electron-builder\Cache"
  if (Test-Path $cache) {
    Add-Content -Path $log -Value "Limpando cache do electron-builder..."
    Remove-Item -LiteralPath $cache -Recurse -Force -ErrorAction SilentlyContinue 2>&1 | Out-File -Append $log
  }

  Add-Content -Path $log -Value "Iniciando build do Electron..."
  Push-Location "C:\Users\PcGabriel\Downloads\Sistema Bypass offline"
  npm run electron:build 2>&1 | Tee-Object -FilePath $log -Append
  Pop-Location
  Add-Content -Path $log -Value "Build finalizado com código: $LASTEXITCODE"
} catch {
  Add-Content -Path $log -Value "ERRO: $($_.Exception.Message)"
  throw
} finally {
  Add-Content -Path $log -Value "=== Fim: $(Get-Date) ==="
}
