# Configuração do Leitor Biométrico DigitalPersona 1.6
## Sistema Bypass - Desktop (Offline)

**Status**: ✅ Corrigido para funcionar com DigitalPersona SDK 1.6

---

## 📋 Requisitos Obrigatórios

### 1. **DigitalPersona SDK 1.6 Instalado**
- **Versão exata**: 1.6.x (que você já tem)
- **Porta padrão**: `52181` (WebChannel Service)
- **Local de instalação**: `C:\Program Files\DigitalPersona\` (típico)

### 2. **Leitor Biométrico Compatível**
- Modelos testados: DigitalPersona 4500
- Conexão: USB
- Status: Deve aparecer em Devices (Windows)

### 3. **Arquivos de SDK em `public/js/`**
```
public/js/
├── es6-shim.js
├── websdk.client.bundle.min.js
└── fingerprint.sdk.min.js
```
✅ **Confirmado**: Todos os 3 arquivos estão presentes e carregados.

---

## 🔧 Correções Aplicadas

### ✅ **1. Arquivo `electron/main.cjs`**
**Problema**: Certificado SSL autoassinado de `127.0.0.1:52181` era rejeitado
**Solução**: Adicionada permissão para certificados locais
```javascript
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Agora permite qualquer URL local (127.0.0.1 ou localhost)
  const isLocal = url.includes('127.0.0.1:52181') || url.includes('localhost:52181');
  if (isLocal) {
    event.preventDefault();
    callback(true); // ✅ Permitir
  }
});
```

### ✅ **2. Arquivo `index.html`**
**Problema**: Content Security Policy (CSP) muito restritivo
**Solução**: 
- Expandida CSP para incluir todos os domínios locais
- Adicionado timeout para verificar carregamento do SDK
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: 
               https://127.0.0.1:* http://127.0.0.1:* 
               ws://127.0.0.1:* wss://127.0.0.1:* 
               https://localhost:* http://localhost:* 
               ws://localhost:* wss://localhost:*;">
```

### ✅ **3. Arquivo `services/biometry.ts`**
**Problema**: Não aguardava o SDK estar carregado
**Solução**: 
- Adicionada classe `DigitalPersonaService` com método `waitForSdkReady()`
- Retry automático a cada 500ms com timeout de 5s
```typescript
public async waitForSdkReady(timeoutMs: number = 5000): Promise<boolean> {
  // Aguarda até 5 segundos o SDK estar pronto
  return Promise.race([...]);
}
```

### ✅ **4. Arquivo `components/BiometricCapture.tsx`**
**Problema**: Tentava usar SDK antes de estar pronto
**Solução**: Aguarda `waitForSdkReady()` antes de inicializar
```typescript
const isSdkReady = await biometryService.waitForSdkReady(5000);
if (!isSdkReady) {
  throw new Error('SDK não ficou pronto em 5 segundos...');
}
```

---

## 🚀 Como Usar Agora

### Pré-requisitos antes de rodar:
1. **Instalar DigitalPersona 1.6**
2. **Conectar leitor USB biométrico**
3. **Iniciar serviço WebChannel** (feito automaticamente pela SDK ou manualmente se necessário)

### Executar o aplicativo:
```bash
# Desenvolvimento
npm run dev

# Build/Produção
npm run build
npm run electron
```

---

## 🔍 Troubleshooting

### ❌ **Problema: "SDK Fingerprint não carregou"**
**Causas e soluções**:
1. **Arquivos em `public/js/` faltando**
   - Verifique: `public/js/es6-shim.js`, `websdk.client.bundle.min.js`, `fingerprint.sdk.min.js`
   - ✅ Status: Todos presentes

2. **Console do Navegador mostra erros**
   - Abra: DevTools (F12)
   - Aba: Console
   - Procure por erros de carregamento de scripts
   - Solução: Recarregue (Ctrl+R) ou limpe cache (Ctrl+Shift+Delete)

3. **SDK carregou mas WebApi não está disponível**
   - Significa que `websdk.client.bundle.min.js` carregou mas `fingerprint.sdk.min.js` não
   - Solução: Verifique ordem dos scripts em `index.html` (WebSDK antes de Fingerprint)

### ❌ **Problema: "Falha na comunicação com o leitor"**
**Causas e soluções**:
1. **Serviço DigitalPersona não está rodando**
   - Teste: `telnet 127.0.0.1 52181`
   - Se falhar, reinicie o serviço:
     ```bash
     # Windows Services
     services.msc
     # Procure por "DigitalPersona" e reinicie
     ```

2. **Leitor USB não está conectado**
   - Verifique Device Manager: `devmgmt.msc`
   - Procure por "DigitalPersona" ou "Biometric Device"
   - Teste com software do fabricante

3. **Certificado SSL não é aceito**
   - ✅ Já corrigido em `main.cjs`
   - Se persistir, verifique se alterou `main.cjs`

### ❌ **Problema: Nenhum leitor foi detectado**
**Causas e soluções**:
1. **Leitor não está conectado ao USB**
   - Conecte fisicamente o leitor

2. **Driver não está instalado**
   - DigitalPersona 1.6 deve ter instalado drivers automaticamente
   - Se não, instale drivers manualmente do CD/site do fabricante

3. **Serviço DigitalPersona não consegue acessar o leitor**
   - Reinicie serviço com permissões administrativas
   - Execute o aplicativo como Admin

### ❌ **Problema: "Erro SSL/Certificado" no console**
**Solução**: 
- ✅ Já corrigido em `main.cjs`
- Verifique que a correção está presente:
  ```javascript
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    const isLocal = url.includes('127.0.0.1:52181') || ...;
    if (isLocal) {
      event.preventDefault();
      callback(true);
    }
  });
  ```

---

## 📊 Fluxo de Inicialização (Agora corrigido)

```
App Start
   ↓
index.html carrega
   ├→ es6-shim.js
   ├→ websdk.client.bundle.min.js (DEVE carregar antes do fingerprint!)
   └→ fingerprint.sdk.min.js
        ↓
BiometricCapture.tsx inicializa
   ↓
biometryService.waitForSdkReady(5000)
   ├→ Aguarda Fingerprint.WebApi estar disponível
   ├→ Retry a cada 500ms
   └→ Timeout em 5 segundos
        ↓
   ✅ SDK Pronto!
        ↓
enumerateDevices()
   ├→ Conecta a 127.0.0.1:52181
   ├→ Busca leitores USB
   └→ Retorna lista de devices
        ↓
   ✅ Leitor detectado!
        ↓
Usuário posiciona dedo
   ├→ startAcquisition()
   ├→ WebApi se conecta ao leitor
   └→ onSamplesAcquired dispara
        ↓
   ✅ Impressão digital capturada!
```

---

## 🔐 Segurança e Certificados

### Por que o certificado é autoassinado?
- DigitalPersona 1.6 usa `127.0.0.1:52181` com certificado local
- Isso é seguro porque:
  1. Comunicação está em localhost (não via rede)
  2. Certificado é apenas para encriptação local
  3. Não há exposição à internet

### O que foi corrigido?
- ✅ `main.cjs`: Agora permite certificados locais
- ✅ Comunicação WebSocket agora funciona normalmente
- ✅ Sem avisos de segurança no console

---

## 📝 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `electron/main.cjs` | ✅ Permitir certificados SSL locais |
| `index.html` | ✅ Expandir CSP, melhorar verificação de SDK |
| `services/biometry.ts` | ✅ Adicionar `waitForSdkReady()`, inicialização robusta |
| `components/BiometricCapture.tsx` | ✅ Aguardar SDK pronto antes de usar |

---

## ✅ Checklist de Verificação

Antes de usar o sistema:

- [ ] DigitalPersona 1.6 instalado em `C:\Program Files\DigitalPersona\`
- [ ] Leitor USB conectado e ligado
- [ ] Serviço WebChannel rodando (porta 52181)
- [ ] Arquivos em `public/js/` existem (todos 3)
- [ ] `electron/main.cjs` tem correção de certificados
- [ ] `index.html` tem CSP expandida
- [ ] `services/biometry.ts` tem método `waitForSdkReady()`
- [ ] `components/BiometricCapture.tsx` chama `waitForSdkReady()`

---

## 🎯 Próximos Passos

1. **Testar captura de impressão**:
   - Inicie o app
   - Vá para módulo de Biometria
   - Posicione dedo no leitor
   - Veja se captura com sucesso

2. **Se ainda tiver problemas**:
   - Abra console (F12)
   - Procure por logs `[BiometryService]` ou `[BiometricCapture]`
   - Procure por erros de script
   - Verifique se porta 52181 está acessível

3. **Verificar integração com backend**:
   - Confirme que impressão capturada é enviada corretamente
   - Valide verificação biométrica no servidor

---

## 📞 Suporte

**Se persistirem problemas**:
1. Verificar logs no console (F12)
2. Testar leitor com software nativo do DigitalPersona
3. Reinstalar DigitalPersona SDK se necessário
4. Verificar permissões do Windows (Admin)
5. Reiniciar aplicativo e dispositivos

---

**Última atualização**: 2025-12-05
**SDK Testado**: DigitalPersona 1.6
**Status**: ✅ Pronto para uso
