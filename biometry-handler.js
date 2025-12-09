const { ipcMain } = require('electron');
const { FingerprintSdk, SampleFormat, DeviceConnected, DeviceDisconnected, SamplesAcquired } = require('digital-persona');

/**
 * Gerencia a comunicação com o leitor biométrico no processo principal do Electron.
 */
class BiometryHandler {
  constructor(mainWindow) {
    this.sdk = new FingerprintSdk();
    this.mainWindow = mainWindow;
    this.registerListeners();
    console.log('[BiometryHandler] Módulo de biometria nativo inicializado.');
  }

  sendMessage(channel, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  registerListeners() {
    // Eventos do SDK nativo para o Renderer
    this.sdk.on(DeviceConnected, (event) => {
      console.log('[BiometryHandler] Evento: Device Connected', event);
      this.sendMessage('biometry-event', { type: 'device-connected', data: event });
    });

    this.sdk.on(DeviceDisconnected, (event) => {
      console.log('[BiometryHandler] Evento: Device Disconnected', event);
      this.sendMessage('biometry-event', { type: 'device-disconnected', data: event });
    });

    this.sdk.on(SamplesAcquired, (event) => {
      console.log('[BiometryHandler] Evento: Samples Acquired');
      // O SDK nativo já retorna a imagem em base64, pronta para uso.
      const imageData = `data:image/png;base64,${event.samples[0]}`;
      this.sendMessage('biometry-event', { type: 'samples-acquired', data: imageData });
    });

    // Comandos do Renderer para o SDK nativo
    ipcMain.handle('biometry-command', async (event, command) => {
      console.log(`[BiometryHandler] Comando recebido: ${command.type}`);
      try {
        switch (command.type) {
          case 'enumerate-devices':
            const devices = await this.sdk.enumerateDevices();
            console.log('[BiometryHandler] Dispositivos enumerados:', devices);
            return { success: true, data: devices };

          case 'start-acquisition':
            const { format, deviceUid } = command.payload;
            // O formato PngImage é o 5 no SDK antigo, mas aqui usamos a enumeração do pacote.
            const sampleFormat = format === 5 ? SampleFormat.PngImage : format;
            await this.sdk.startAcquisition(sampleFormat, deviceUid);
            console.log(`[BiometryHandler] Aquisição iniciada no device: ${deviceUid}`);
            return { success: true };

          case 'stop-acquisition':
            await this.sdk.stopAcquisition();
            console.log('[BiometryHandler] Aquisição parada.');
            return { success: true };

          default:
            console.warn(`[BiometryHandler] Comando desconhecido: ${command.type}`);
            return { success: false, error: 'Comando desconhecido' };
        }
      } catch (error) {
        console.error(`[BiometryHandler] Erro ao executar comando '${command.type}':`, error);
        return { success: false, error: error.message };
      }
    });
  }
}

/**
 * Inicializa o handler de biometria após a janela principal ser criada.
 * @param {BrowserWindow} mainWindow A janela principal da aplicação.
 */
function initBiometry(mainWindow) {
  // Garante que só teremos uma instância.
  if (!global.biometryHandler) {
    global.biometryHandler = new BiometryHandler(mainWindow);
  }
}

module.exports = { initBiometry };