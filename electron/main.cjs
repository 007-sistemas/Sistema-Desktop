const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

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
  });
};

app.on('ready', createWindow);

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

// Handler vazio para 'biometry-command' (não usado mais, mas preload.cjs ainda tenta invocar)
// O sistema agora usa WebSDK direto no frontend via services/biometry.ts
ipcMain.handle('biometry-command', async (event, command) => {
  console.log('[main] biometry-command recebido mas ignorado (use WebSDK direto no frontend)', command);
  return { error: 'Use WebSDK direto no frontend, não IPC' };
});
