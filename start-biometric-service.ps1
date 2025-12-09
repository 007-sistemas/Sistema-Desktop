# Script para verificar o leitor biométrico DigitalPersona U.are.U SDK
# Este script DEVE ser executado como ADMINISTRADOR

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificando Leitor Biométrico DigitalPersona" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar leitor USB
Write-Host "[1/1] Verificando leitor biométrico..." -ForegroundColor Yellow
$readers = Get-PnpDevice | Where-Object {$_.Name -like "*U.are.U*" -or $_.Name -like "*DigitalPersona*" -or $_.Name -like "*Fingerprint*"}

if ($readers) {
    Write-Host "✅ Leitor(es) encontrado(s):" -ForegroundColor Green
    foreach ($reader in $readers) {
        $status = if ($reader.Status -eq "OK") { "✅ Conectado" } else { "⚠️  $($reader.Status)" }
        Write-Host "   - $($reader.Name) [Status: $status]" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "✅ Sistema PRONTO para uso com o SDK nativo." -ForegroundColor Green
    Write-Host "   Certifique-se de que sua aplicação desktop está usando um pacote Node.js" -ForegroundColor Green
    Write-Host "   compatível com o Digital Persona U.are.U SDK." -ForegroundColor Green
} else {
    Write-Host "❌ Nenhum leitor biométrico encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Possíveis soluções:" -ForegroundColor Yellow
    Write-Host "   1. Verifique se o leitor está bem conectado na porta USB." -ForegroundColor Yellow
    Write-Host "   2. Reinstale os drivers do Digital Persona U.are.U SDK 3.4." -ForegroundColor Yellow
    Write-Host "   3. Teste em outra porta USB." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pressione ENTER para fechar..." -ForegroundColor Gray
Read-Host
