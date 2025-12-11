const { ipcMain } = require('electron');

/**
 * Gerencia a comunicação com o leitor biométrico no processo principal do Electron.
 * Compatível com SDK DigitalPersona 3.4+
 * 
 * ESTRATÉGIA:
 * 1. Aguarda o SDK estar realmente pronto (com retry automático)
 * 2. Registra listeners PERSISTENTES que funcionam mesmo após reconexões
 * 3. Mantém estado sincronizado com o leitor
 */
class BiometryHandler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.sdk = null;
    this.isInitialized = false;
    this.sdkClasses = {};
    this.listenersRegistered = false;
    this.initAttempts = 0;
    this.maxInitAttempts = 10;
    this.retryInterval = 1000; // ms
    
    // Tentar inicializar imediatamente
    this.initializeSDK();
  }

  initializeSDK() {
    if (this.isInitialized) {
      console.log('[BiometryHandler] SDK já foi inicializado');
      return;
    }

    try {
      console.log(`[BiometryHandler] Tentativa de inicialização ${this.initAttempts + 1}/${this.maxInitAttempts}...`);
      
      // Carregar módulo
      const dp = require('digital-persona');
      
      // Extrair classes (com fallbacks para diferentes versões)
      const FingerprintSdk = dp.FingerprintSdk || dp.default?.FingerprintSdk;
      const SampleFormat = dp.SampleFormat || dp.default?.SampleFormat;
      const DeviceConnected = dp.DeviceConnected || dp.default?.DeviceConnected || 'DeviceConnected';
      const DeviceDisconnected = dp.DeviceDisconnected || dp.default?.DeviceDisconnected || 'DeviceDisconnected';
      const SamplesAcquired = dp.SamplesAcquired || dp.default?.SamplesAcquired || 'SamplesAcquired';

      if (!FingerprintSdk) {
        throw new Error('FingerprintSdk não encontrado');
      }

      // Armazenar classes
      this.sdkClasses = {
        FingerprintSdk,
        SampleFormat: SampleFormat || { PngImage: 5 },
        DeviceConnected,
        DeviceDisconnected,
        SamplesAcquired
      };

      // Criar instância do SDK
      this.sdk = new FingerprintSdk();
      
      console.log('[BiometryHandler] ✅ Instância do SDK criada');

      // Registrar listeners PERSISTENTES
      this.registerListeners();
      
      this.isInitialized = true;
      this.listenersRegistered = true;
      console.log('[BiometryHandler] ✅ SDK DigitalPersona pronto para uso!');
      
      // Notificar aplicação que SDK está pronto
      this.sendMessage('sdk-ready', { status: 'ready' });
      
    } catch (error) {
      console.warn(`[BiometryHandler] ❌ Falha na inicialização (tentativa ${this.initAttempts + 1}): ${error.message}`);
      
      this.initAttempts++;
      
      // Tentar novamente se não atingiu o limite
      if (this.initAttempts < this.maxInitAttempts) {
        setTimeout(() => {
          this.initializeSDK();
        }, this.retryInterval);
      } else {
        console.error('[BiometryHandler] ❌ Falha permanente: SDK não pôde ser inicializado após múltiplas tentativas');
      }
    }
  }

  sendMessage(channel, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  registerListeners() {
    if (!this.sdk) {
      console.warn('[BiometryHandler] SDK não disponível para registrar listeners');
      return;
    }

    console.log('[BiometryHandler] Registrando listeners persistentes...');
    const self = this;
    const classes = this.sdkClasses;

    try {
      // Listener para Device Connected
      if (typeof this.sdk.on === 'function') {
        this.sdk.on(classes.DeviceConnected, (event) => {
          console.log('[BiometryHandler] ✅ DEVICE CONECTADO:', event);
          self.sendMessage('biometry-event', { type: 'device-connected', data: event });
        });

        // Listener para Device Disconnected
        this.sdk.on(classes.DeviceDisconnected, (event) => {
          console.log('[BiometryHandler] ⚠️ DEVICE DESCONECTADO:', event);
          self.sendMessage('biometry-event', { type: 'device-disconnected', data: event });
        });

        // Listener para Samples Acquired - ESTE É O CRÍTICO
        this.sdk.on(classes.SamplesAcquired, (event) => {
          console.log('[BiometryHandler] 🖐️ AMOSTRA CAPTURADA! Evento:', JSON.stringify(event));
          
          try {
            if (!event || !event.samples) {
              console.error('[BiometryHandler] Evento de amostra sem dados!', event);
              return;
            }

            let imageData = Array.isArray(event.samples) ? event.samples[0] : event.samples;
            
            if (!imageData) {
              console.error('[BiometryHandler] Nenhuma amostra nos dados!');
              return;
            }

            // Garantir que tenha prefixo base64/data
            if (typeof imageData === 'string') {
              if (!imageData.startsWith('data:image')) {
                // Adicionar prefixo se necessário
                if (!imageData.startsWith('/')) {
                  imageData = `data:image/png;base64,${imageData}`;
                }
              }
            }
            
            console.log('[BiometryHandler] ✅ Amostra processada com sucesso (tamanho: ' + imageData.length + ' bytes)');
            
            // Enviar para renderer
            self.sendMessage('biometry-event', { 
              type: 'samples-acquired', 
              data: imageData
            });
            
          } catch (err) {
            console.error('[BiometryHandler] ❌ Erro ao processar amostra:', err.message);
            self.sendMessage('biometry-event', { 
              type: 'error', 
              data: 'Erro ao processar amostra: ' + err.message 
            });
          }
        });

        console.log('[BiometryHandler] ✅ Todos os listeners registrados com sucesso!');
      } else {
        console.error('[BiometryHandler] SDK.on não é uma função!');
      }
    } catch (error) {
      console.error('[BiometryHandler] Erro crítico ao registrar listeners:', error.message);
    }
  }
}

/**
 * Inicializa o handler de biometria após a janela principal ser criada.
 * @param {BrowserWindow} mainWindow A janela principal da aplicação.
 */
function initBiometry(mainWindow) {
  // Garanta que só teremos uma instância.
  if (!global.biometryHandler) {
    global.biometryHandler = new BiometryHandler(mainWindow);
    setupBiometryCommands(global.biometryHandler);
  }
}

/**
 * Configura os handlers de comando IPC para biometria
 */
function setupBiometryCommands(biometryHandler) {
  ipcMain.handle('biometry-command', async (event, command) => {
    console.log(`[BiometryHandler] Comando recebido: ${command?.type}`);
    
    // Aguardar SDK estar inicializado se ainda não estiver
    let attempts = 0;
    while (!biometryHandler.isInitialized && attempts < 20) {
      console.log(`[BiometryHandler] Aguardando SDK ficar pronto... (${attempts}/20)`);
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }

    if (!biometryHandler.isInitialized || !biometryHandler.sdk) {
      console.error('[BiometryHandler] SDK não está inicializado após aguardar');
      return { success: false, error: 'SDK_NOT_INITIALIZED' };
    }

    try {
      switch (command?.type) {
        case 'enumerate-devices':
          try {
            console.log('[BiometryHandler] Enumerando dispositivos...');
            const devices = await biometryHandler.sdk.enumerateDevices();
            console.log('[BiometryHandler] Dispositivos encontrados:', devices);
            return { success: true, data: devices || [] };
          } catch (e) {
            console.error('[BiometryHandler] Erro ao enumerar:', e.message);
            return { success: false, error: e.message, data: [] };
          }

        case 'start-acquisition':
          try {
            const { format, deviceUid } = command.payload || {};
            console.log(`[BiometryHandler] ⏳ Iniciando aquisição: format=${format}, device=${deviceUid}`);
            
            // Garantir que o formato está correto
            let sampleFormat = format;
            if (biometryHandler.sdkClasses.SampleFormat && biometryHandler.sdkClasses.SampleFormat.PngImage !== undefined) {
              sampleFormat = format === 5 ? biometryHandler.sdkClasses.SampleFormat.PngImage : format;
            }
            
            console.log(`[BiometryHandler] Chamando startAcquisition com formato: ${sampleFormat}`);
            await biometryHandler.sdk.startAcquisition(sampleFormat, deviceUid);
            console.log(`[BiometryHandler] ✅ Aquisição iniciada com sucesso no device: ${deviceUid}`);
            return { success: true };
          } catch (e) {
            console.error('[BiometryHandler] ❌ Erro ao iniciar aquisição:', e.message);
            console.error('[BiometryHandler] Stack:', e.stack);
            return { success: false, error: e.message };
          }

        case 'stop-acquisition':
          try {
            console.log('[BiometryHandler] Parando aquisição...');
            await biometryHandler.sdk.stopAcquisition();
            console.log('[BiometryHandler] ✅ Aquisição parada com sucesso');
            return { success: true };
          } catch (e) {
            console.error('[BiometryHandler] Erro ao parar aquisição:', e.message);
            return { success: false, error: e.message };
          }

        case 'check-service':
          console.log('[BiometryHandler] Check-service: SDK nativo está ' + (biometryHandler.isInitialized ? 'PRONTO' : 'NÃO PRONTO'));
          return { ok: biometryHandler.isInitialized, message: biometryHandler.isInitialized ? 'SDK nativo pronto' : 'SDK nativo ainda não está pronto' };

        case 'start-service':
          console.log('[BiometryHandler] Start-service: SDK nativo já está ativo');
          return { ok: true, message: 'SDK nativo já está ativo' };

        default:
          console.warn(`[BiometryHandler] Comando desconhecido: ${command?.type}`);
          return { success: false, error: 'Comando desconhecido' };
      }
    } catch (error) {
      console.error(`[BiometryHandler] Erro ao executar comando '${command?.type}':`, error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initBiometry };