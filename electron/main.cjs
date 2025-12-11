const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Carregar biometry handler
const { initBiometry } = require(path.join(__dirname, 'biometry-handler.cjs'));

// electron-is-dev é um módulo ES, então usamos dirname e NODE_ENV
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

const createWindow = () => {
  console.log('[main] Criando janela principal...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true, // Habilitado para segurança
      enableRemoteModule: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  console.log(`[main] Carregando URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // Log de console do renderer para diagnosticar tela em branco
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[renderer][lvl:${level}] ${message} (${sourceId}:${line})`);
  });

  // DevTools desabilitado em dev para evitar erros de inicialização
  // Abra via F12 ou menu se necessário depuração
  if (isDev) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.openDevTools();
      }
    }, 2000);
  }

  mainWindow.on('closed', () => {
    console.log('[main] Janela foi fechada');
    mainWindow = null;
  });

  // Notificar quando a janela estiver pronta para interação
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] ✅ Conteúdo da janela carregado');
    // Debug: loga começo do body para verificar se React montou
    mainWindow.webContents.executeJavaScript(
      'console.log("[renderer-dom] body snippet:", document.body.innerHTML.slice(0, 200));'
    ).catch(() => {});
  });
};

// Simple file logger for main process (useful in production builds)
const logDir = () => path.join(app.getPath('appData') || process.cwd(), 'DigitAll');
const logFile = () => path.join(logDir(), 'websdk-start.log');
function writeMainLog(...args) {
  try {
    const dir = logDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
    fs.appendFileSync(logFile(), line, { encoding: 'utf8' });
  } catch (e) {
    console.error('[main] Falha ao escrever log:', e);
  }
}

// Poll the local WebSDK endpoint for a limited time and try auto-start if offline
async function pollWebSdkAndEnsureRunning({ intervalMs = 2000, timeoutMs = 60000 } = {}) {
  const https = require('https');
  const deadline = Date.now() + timeoutMs;
  writeMainLog('[main] Iniciando watcher do WebSDK (timeoutMs=' + timeoutMs + ')');
  while (Date.now() < deadline) {
    try {
      const ok = await new Promise((resolve) => {
        const req = https.get('https://127.0.0.1:52181/get_connection', { rejectUnauthorized: false, timeout: 2000 }, (res) => {
          // consume
          res.on('data', () => {});
          res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
      writeMainLog('[main] pollWebSdk result:', ok);
      if (ok) {
        writeMainLog('[main] WebSDK online durante watcher');
        return true;
      }
      // attempt to start the service if offline
      writeMainLog('[main] WebSDK offline, tentando iniciar via attemptStartWebSdkService');
      try {
        await attemptStartWebSdkService();
      } catch (e) {
        writeMainLog('[main] attemptStartWebSdkService erro:', String(e));
      }
    } catch (e) {
      writeMainLog('[main] Erro no watcher do WebSDK:', String(e));
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  writeMainLog('[main] Watcher do WebSDK expirou sem sucesso');
  return false;
}

app.on('ready', async () => {
  console.log('[main] 🚀 App iniciando - tentando auto-iniciar WebSDK...');
  writeMainLog('[main] App ready - iniciando tentativa de auto-start');
  try {
    await attemptStartWebSdkService();
    writeMainLog('[main] attemptStartWebSdkService chamado com sucesso');
  } catch (e) {
    writeMainLog('[main] Erro ao chamar attemptStartWebSdkService:', String(e));
  }
  // Start watcher in background (do not block UI creation)
  pollWebSdkAndEnsureRunning({ intervalMs: 2000, timeoutMs: 60000 }).then(result => {
    writeMainLog('[main] pollWebSdkAndEnsureRunning finalizado, result=', result);
  }).catch((e) => writeMainLog('[main] pollWebSdkAndEnsureRunning erro:', String(e)));
  console.log('[main] ✅ Chamada de auto-start do WebSDK concluída, criando janela...');
  createWindow();
  
  // Inicializar biometry handler após criar janela
  if (mainWindow) {
    console.log('[main] Inicializando handler de biometria nativa...');
    initBiometry(mainWindow);
  }
});

app.on('window-all-closed', () => {
  console.log('[main] Todas as janelas foram fechadas');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('[main] Ativando aplicação');
  if (mainWindow === null) {
    createWindow();
  }
});

// Verificar e reiniciar WebSDK quando app ganha foco (após fechar/reopenear)
app.on('browser-window-focus', (event, window) => {
  console.log('[main] 🔄 App retomou foco - verificando WebSDK...');
  attemptStartWebSdkService().then((started) => {
    if (started) {
      console.log('[main] ✅ WebSDK já estava running ou foi iniciado');
    } else {
      console.log('[main] ⚠️ WebSDK não encontrado, usuário pode usar botão "Iniciar Serviço"');
    }
  }).catch((e) => {
    console.error('[main] Erro ao verificar WebSDK no focus:', e);
  });
});

// Limpar recursos quando aplicação está sendo fechada
app.on('before-quit', () => {
  console.log('[main] Aplicação será fechada, limpando recursos...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// Permitir certificados TLS autoassinados vindos do serviço local (localhost/127.0.0.1)
// O WebSDK do leitor usa https://127.0.0.1:52181 com certificado local.
// CRÍTICO para DigitalPersona: Sem isso, a comunicação com o leitor falha!
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  try {
    // Permitir certificados para qualquer host local (127.0.0.1 / localhost) em qualquer porta.
    // O WebSDK pode negociar conexões em portas dinâmicas (ex: 9001), então precisamos aceitar
    // certificados autoassinados para o loopback durante desenvolvimento.
    const isLocal = typeof url === 'string' && (
      url.startsWith('https://127.0.0.1') ||
      url.startsWith('https://localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('localhost')
    );

    if (isLocal) {
      console.log('[main] ✅ certificate-error: PERMITINDO certificado local para:', url);
      event.preventDefault();
      callback(true);
      return;
    }
  } catch (e) {
    console.error('[main] Erro ao processar certificate-error:', e);
  }
  console.log('[main] ❌ certificate-error: REJEITANDO certificado para:', url);
  callback(false);
});

// Handle IPC messages if needed
ipcMain.handle('ping', () => {
  console.log('[main] Ping recebido');
  return 'pong';
});

/**
 * Tenta iniciar o serviço WebSDK/DigitalPersona local em caminhos comuns.
 * Isso resolve o problema onde o serviço não responde em 127.0.0.1:9001 ao reabrir o app.
 */
const attemptStartWebSdkService = async () => {
  try {
    writeMainLog('[main] attemptStartWebSdkService: iniciando busca por executáveis comuns');
    const { spawn } = require('child_process');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    
    // Caminhos comuns onde o agente WebSDK pode estar instalado
    const commonPaths = [
      'C:\\Program Files\\DigitalPersona\\Bin\\DpHostW.exe',
      'C:\\Program Files (x86)\\DigitalPersona\\Bin\\DpHostW.exe',
      'C:\\Program Files\\DigitalPersona\\WebAPI\\bin\\DPWebChannelHost.exe',
      'C:\\Program Files (x86)\\DigitalPersona\\WebAPI\\bin\\DPWebChannelHost.exe',
      'C:\\Program Files\\DigitalPersona\\WebUSB\\DPWebChannelHost.exe',
      'C:\\Program Files (x86)\\DigitalPersona\\WebUSB\\DPWebChannelHost.exe',
      path.join(os.homedir(), 'AppData\\Local\\DigitalPersona\\WebAPI\\DPWebChannelHost.exe'),
    ];
    
    for (const exePath of commonPaths) {
      try {
        if (fs.existsSync(exePath)) {
          writeMainLog('[main] ✅ Encontrado WebSDK em:', exePath);
          console.log('[main] ✅ Encontrado WebSDK em:', exePath);
          try {
            spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
            writeMainLog('[main] ✅ Tentativa de iniciar WebSDK executada para', exePath);
            console.log('[main] ✅ Tentativa de iniciar WebSDK executada');
          } catch (e) {
            writeMainLog('[main] Erro ao spawn do exePath:', exePath, String(e));
            console.warn('[main] Não foi possível spawn do', exePath, ':', e.message);
          }
          return true;
        }
      } catch (e) {
        writeMainLog('[main] Não foi possível acessar exePath:', exePath, String(e));
        console.warn('[main] Não foi possível iniciar de', exePath, ':', e.message);
      }
    }
    writeMainLog('[main] ⚠️ Nenhum executável do WebSDK encontrado nos caminhos comuns');
    console.warn('[main] ⚠️ Nenhum executável do WebSDK encontrado nos caminhos comuns');
    return false;
  } catch (e) {
    writeMainLog('[main] Erro ao tentar iniciar WebSDK:', String(e));
    console.error('[main] Erro ao tentar iniciar WebSDK:', e);
    return false;
  }
};

// Menu e outras configurações continuam abaixo...