# Script para garantir que o DigitalPersona WebChannel Service está rodando
# Use este script antes de iniciar a aplicação se o leitor não for reconhecido

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificação do Serviço DigitalPersona" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar se a porta 52181 está respondendo
Write-Host "`n[1/3] Verificando porta 52181..." -ForegroundColor Yellow

try {
    $test = Test-NetConnection -ComputerName 127.0.0.1 -Port 52181 -WarningAction SilentlyContinue
    if ($test.TcpTestSucceeded) {
        Write-Host "✅ Porta 52181 está respondendo - Serviço DigitalPersona está ativo" -ForegroundColor Green
    } else {
        Write-Host "❌ Porta 52181 não está respondendo - Reiniciando serviço..." -ForegroundColor Red
        
        # 2. Tentar reiniciar o serviço DigitalPersona
        Write-Host "`n[2/3] Tentando reiniciar serviço DigitalPersona..." -ForegroundColor Yellow
        
        # Parar o serviço
        Write-Host "Parando serviço..." -ForegroundColor Yellow
        Stop-Service -Name "DPWebChannelService" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Iniciar o serviço
        Write-Host "Iniciando serviço..." -ForegroundColor Yellow
        Start-Service -Name "DPWebChannelService" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        
        # Verificar novamente
        $test2 = Test-NetConnection -ComputerName 127.0.0.1 -Port 52181 -WarningAction SilentlyContinue
        if ($test2.TcpTestSucceeded) {
            Write-Host "✅ Serviço reiniciado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Serviço não respondeu. Verifique:" -ForegroundColor Yellow
            Write-Host "   - DigitalPersona 1.6 está instalado?" -ForegroundColor Yellow
            Write-Host "   - Leitor biométrico está conectado?" -ForegroundColor Yellow
            Write-Host "   - Tente reiniciar o computador" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "❌ Erro ao testar conexão: $_" -ForegroundColor Red
}

# 3. Verificar leitor conectado
Write-Host "`n[3/3] Verificando leitores biométricos..." -ForegroundColor Yellow

# Tentar verificar no Device Manager
$biometricDevices = Get-PnpDevice | Where-Object { $_.Name -like "*DigitalPersona*" -or $_.Description -like "*Biometric*" }

if ($biometricDevices) {
    Write-Host "✅ Leitor(es) detectado(s):" -ForegroundColor Green
    foreach ($device in $biometricDevices) {
        Write-Host "   - $($device.Name) ($($device.Status))" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Nenhum leitor biométrico detectado" -ForegroundColor Yellow
    Write-Host "   Verifique se o leitor DigitalPersona 4500 está conectado via USB" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verificação concluída!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nVocê pode agora iniciar a aplicação com:" -ForegroundColor White
Write-Host "npm run electron:dev" -ForegroundColor Cyan
