# Solução Final para Biometria

## Problema
- SHA-256 hash nunca bate (cada leitura gera dado diferente)
- Comparação de string/template não funciona bem

## Solução Implementada
Comparação byte-a-byte (Hamming Distance) do template FMD:
- Compara cada byte do template
- Se 70%+ dos bytes forem iguais = mesmo dedo
- Margem de 50% entre candidatos

## Código a Implementar em views/PontoMachine.tsx

Substituir a função getMatchRate e handleIdentification por:

```typescript
// Comparação byte-a-byte do template (Hamming Distance)
const compareByteByByte = (template1?: string, template2?: string): number => {
  if (!template1 || !template2) return 0;

  try {
    const minLen = Math.min(template1.length, template2.length);
    let matches = 0;
    
    // Comparar em pares de caracteres (2 chars = 1 byte em hex)
    for (let i = 0; i < minLen - 1; i += 2) {
      const byte1 = template1.substring(i, i + 2);
      const byte2 = template2.substring(i, i + 2);
      if (byte1 === byte2) {
        matches++;
      }
    }

    const totalBytes = Math.floor(minLen / 2);
    const matchRate = totalBytes > 0 ? matches / totalBytes : 0;
    console.log(`[PontoMachine] Hamming Distance: ${(matchRate * 100).toFixed(1)}% bytes iguais`);
    return matchRate;
  } catch (e) {
    console.error('[PontoMachine] Erro:', e);
    return 0;
  }
};

// handleIdentification: usar compareByteByByte em vez de hash exato
// Threshold: 0.70 (70% dos bytes devem bater)
// Margem: 50% entre melhor e segundo melhor
```

## Próximas Etapas
1. Implementar comparação byte-a-byte
2. Testar com 3-5 leituras da mesma digital
3. Se ainda não funcionar, será necessário usar biblioteca comercial do DigitalPersona
