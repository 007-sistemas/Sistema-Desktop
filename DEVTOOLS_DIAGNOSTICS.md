# Diagnóstico via DevTools

## Instruções
1. Abra a aplicação (npm run dev)
2. Clique na aba "Diagnóstico Técnico" (em BiometriaManager)
3. Abra o DevTools (F12)
4. Cole CADA um dos comandos abaixo no Console e copie o output completo

---

## Teste 1: Verificar configuração WebSDK armazenada
```javascript
console.log('=== TESTE 1: sessionStorage ===');
const websdk = sessionStorage.getItem('websdk');
console.log('sessionStorage.websdk =', websdk);
if (websdk) {
  try {
    const parsed = JSON.parse(websdk);
    console.log('Parsed:', parsed);
  } catch(e) {
    console.log('Não é JSON válido');
  }
}
```

---

## Teste 2: SDK Pronto?
```javascript
console.log('\n=== TESTE 2: waitForSdkReady ===');
biometryService.waitForSdkReady(5000)
  .then(r => console.log('✓ waitForSdkReady => ', r))
  .catch(e => console.error('✗ waitForSdkReady ERROR:', e));
```

---

## Teste 3: Listar Dispositivos
```javascript
console.log('\n=== TESTE 3: enumerateDevices ===');
biometryService.enumerateDevices()
  .then(devices => {
    console.log('✓ enumerateDevices => ', devices);
    console.log('  Tipo:', typeof devices);
    console.log('  É array?', Array.isArray(devices));
    console.log('  Quantidade:', devices?.length);
    if (Array.isArray(devices)) {
      devices.forEach((d, i) => console.log(`    [${i}] ${d}`));
    }
  })
  .catch(e => {
    console.error('✗ enumerateDevices ERROR:', e);
    console.error('  Mensagem:', e.message);
    console.error('  Stack:', e.stack);
  });
```

---

## Teste 4: Iniciar Aquisição (Cuidado: pode tentar capturar!)
```javascript
console.log('\n=== TESTE 4: startAcquisition ===');
biometryService.startAcquisition(5 /* SampleFormat.PngImage */)
  .then(deviceId => {
    console.log('✓ startAcquisition OK => ', deviceId);
    console.log('  Colocar dedo no sensor agora... (parar em ~2 segundos)');
    setTimeout(() => {
      biometryService.stopAcquisition()
        .then(() => console.log('✓ stopAcquisition OK'))
        .catch(e => console.error('✗ stopAcquisition ERROR:', e));
    }, 2000);
  })
  .catch(e => {
    console.error('✗ startAcquisition ERROR:', e);
    console.error('  Mensagem:', e.message);
    console.error('  Stack:', e.stack);
  });
```

---

## Teste 5: Debug Integrado Completo
```javascript
console.log('\n=== TESTE 5: _fingerprintDebug ===');
window._fingerprintDebug().catch(e => console.error('Debug error:', e));
```

---

## O que esperar

### Sucesso
- `enumerateDevices` retorna um array com UUIDs do leitor
- `startAcquisition` retorna o deviceId e fica pronto para captura
- Nenhum erro de CSP/TLS na aba Console

### Erro comum: "Communication failure"
- Pode indicar WebSDK não conectado à porta 9001
- Verificar se CSP/certificado está bloqueando WSS

### Erro comum: "No device found"
- Leitor USB não foi detectado
- Verificar se drivers estão OK (executar `start-biometric-service.ps1`)

---

## Copiar todos os outputs e colar aqui para análise
