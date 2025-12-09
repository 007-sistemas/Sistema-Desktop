# 🎯 GUIA RÁPIDO - Ativar Leitor Biométrico

**⏱️ Tempo estimado: 5 minutos**

---

## ✅ Step 1: Verificar Ambiente (1 min)

### Windows Services
```powershell
# Abra PowerShell como Admin
services.msc
# Procure por: "DigitalPersona Web SDK" ou similar
# Status deve estar: ✅ Running
```

### Testar Porta 52181
```powershell
# PowerShell
Test-NetConnection -ComputerName 127.0.0.1 -Port 52181
# Deve retornar: "TcpTestSucceeded : True"
```

### Leitor USB
- ✅ Plugue leitor na USB
- Device Manager (devmgmt.msc)
- Procure por "DigitalPersona" ou "Biometric"
- Status: ✅ Deve estar sem ⚠️ de erro

---

## ✅ Step 2: Código Já Está Corrigido (1 min)

As seguintes correções já foram aplicadas:

```
✅ electron/main.cjs - Certificados SSL aceitos
✅ index.html - CSP expandida + verificação SDK
✅ services/biometry.ts - waitForSdkReady() implementado
✅ components/BiometricCapture.tsx - Aguarda SDK pronto
```

**Você NÃO precisa fazer nada** - tudo já está corrigido!

---

## ✅ Step 3: Iniciar Aplicativo (2 min)

### Modo Desenvolvimento
```bash
npm install   # Se não fez ainda
npm run dev
```

### Verificar DevTools (F12)
```
Console deve mostrar:
✅ Scripts de Biometria DigitalPersona 1.6 injetados via HTML
✅ Verificando SDK Fingerprint no window load...
✅ SDK Fingerprint.WebApi carregado com sucesso.
✅ BiometryService criada com sucesso
✅ Carregando dispositivos...
```

---

## ✅ Step 4: Testar Captura (1 min)

1. Na interface, vá para: **Biometria** ou **Autenticação**
2. Selecione leitor (ou fica automático se só tiver um)
3. Clique em: **Iniciar Captura** ou similar
4. Posicione **dedo no leitor**
5. Veja impressão capturada na tela

---

## ❌ Se Não Funcionar

### Erro: "SDK não carregou"
```bash
# Solução:
1. F12 → Console → veja erros de script
2. Refresh página (Ctrl+R)
3. Limpar cache (Ctrl+Shift+Delete)
4. Reload app (Ctrl+Q e rodar novamente)
```

### Erro: "Falha na comunicação com leitor"
```bash
# Solução:
1. Verifique: services.msc → DigitalPersona rodando
2. Reinicie serviço:
   - services.msc → DigitalPersona Web SDK → Restart
3. Verifique porta: Test-NetConnection -ComputerName 127.0.0.1 -Port 52181
```

### Erro: "Nenhum leitor encontrado"
```bash
# Solução:
1. Plugue leitor USB
2. Verifique Device Manager (devmgmt.msc)
3. Procure por "DigitalPersona" ou "Biometric Device"
4. Se houver ⚠️ amarelo: clique Update Driver
5. Restart app
```

---

## 🎯 Resultado Esperado

Quando funcionar corretamente:

```
✅ DevTools Console (F12):
   - Sem erros de script
   - Mostra "[BiometryService]" logs verdes
   - Mostra "[BiometricCapture]" logs azuis

✅ Interface:
   - Leitor aparece na lista
   - Botão "Iniciar Captura" funciona
   - Dedo no leitor captura impressão
   - Imagem aparece na tela
```

---

## 📞 Troubleshooting Completo

Para guia completo de problemas, veja:
👉 **`BIOMETRIC_SETUP_1.6.md`** (seção Troubleshooting)

---

## 🚀 Pronto!

Sistema está **100% pronto para usar** com DigitalPersona 1.6.

**Não há nenhuma config adicional necessária** - tudo foi corrigido no código!

---

**Data**: 2025-12-05 | **Status**: ✅ Pronto | **Versão**: 1.6
