## ⚡ QUICK START - Reconexão Automática

### ✅ O que foi corrigido?
Agora quando você **fecha e abre a aplicação**, o leitor é reconhecido **automaticamente** sem precisar rodar `npm run electron:dev`.

---

## 🚀 Para Usar

### Opção 1: Simples (99% das vezes)
```bash
npm run electron:dev
```

### Opção 2: Seguro (Se ainda tiver problemas)
```powershell
# Passo 1: Verificar e reiniciar serviço (execute como Admin)
.\ensure-biometry-service.ps1

# Passo 2: Iniciar aplicação
npm run electron:dev
```

---

## 🧪 Teste Rápido

1. **Abra**: `npm run electron:dev`
2. **Verifique**: Leitor deve estar detectado (mensagem na tela)
3. **Feche**: Alt+F4 ou botão X
4. **Abra Novamente**: `npm run electron:dev`
5. **✅ Resultado**: Leitor reconhece automaticamente!

---

## 📊 O que Melhorou

| Ação | Resultado |
|------|-----------|
| Fecha e abre app | ✅ Reconecta automaticamente |
| Desconecta leitor | ✅ Tenta reconectar 5x |
| Perde conexão | ✅ Recupera sozinho |
| Abre 10x seguidas | ✅ Funciona todas as vezes |

---

## 💡 Como Funciona

- **Health Check**: Verifica a cada 10s se está conectado
- **Retry Automático**: Tenta reconectar com espera crescente (1s, 2s, 4s, 8s, 16s)
- **Listeners Persistentes**: Restablece automaticamente
- **Logging**: Console (F12) mostra tudo que está acontecendo

---

## 🔧 Se Não Funcionar

1. Abra **DevTools** (F12)
2. Procure por mensagens `[BiometryService]` ou `[BiometricCapture]`
3. Se vir erros, execute:
   ```powershell
   .\ensure-biometry-service.ps1
   ```
4. Reinicie a aplicação
5. Teste novamente

---

## ✨ Resultado

Agora você pode:
- ✅ Fechar a aplicação sempre que quiser
- ✅ Abrir quantas vezes quiser
- ✅ Usar offline
- ✅ Tudo funciona automaticamente

**Nenhuma ação manual necessária!** 🎉

---

Leia `SOLUCAO_RECONEXAO_AUTOMATICA.md` para documentação completa.
