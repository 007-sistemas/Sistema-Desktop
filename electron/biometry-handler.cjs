const { ipcMain } = require('electron');
const https = require('https');

class BiometryHandler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isInitialized = false;
    this.websdk_url = 'https://127.0.0.1:52181';
    
    console.log('[BiometryHandler] ✅ Inicializando handler com WebSDK...');
    console.log('[BiometryHandler] WebSDK em:', this.websdk_url);
    
    this.registerIpcHandlers();
    this.isInitialized = true;
  }

  registerIpcHandlers() {
    ipcMain.handle('biometry-command', async (event, command) => {
      try {
        console.log('[BiometryHandler] Recebido comando:', command.type);
        
        switch (command.type) {
          case 'enumerate-devices':
            return await this.enumerateDevices();
          
          case 'start-acquisition':
            return await this.startAcquisition(command.deviceId);
          
          case 'stop-acquisition':
            return await this.stopAcquisition();
          
          case 'check-status':
            return await this.checkStatus();
          
          case 'start-service':
            return await this.startService();
          
          default:
            throw new Error(`Comando desconhecido: ${command.type}`);
        }
      } catch (error) {
        console.error('[BiometryHandler] Erro:', error.message);
        return { success: false, error: error.message };
      }
    });

    // Listener para eventos do main
    ipcMain.on('biometry-listener', (event, channel) => {
      console.log('[BiometryHandler] Listener registrado para:', channel);
    });
  }

  /**
   * Faz requisição HTTPS para WebSDK
   */
  httpsRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.websdk_url);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 52181,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        rejectUnauthorized: false // Ignorar certificado auto-assinado
      };

      const req = https.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            if (body) {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } else {
              resolve({ success: true });
            }
          } catch (e) {
            resolve({ success: true, raw: body });
          }
        });
      });

      req.on('error', (error) => {
        console.error('[BiometryHandler] Erro de requisição:', error.message);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout na requisição do WebSDK'));
      });

      req.setTimeout(5000);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Enumera dispositivos biométricos disponíveis
   */
  async enumerateDevices() {
    try {
      console.log('[BiometryHandler] Enumerando dispositivos...');
      
      // Tentar múltiplos endpoints possíveis
      let result = null;
      const endpoints = ['/devices', '/api/devices', '/list'];
      
      for (const endpoint of endpoints) {
        try {
          console.log('[BiometryHandler] Tentando endpoint:', endpoint);
          result = await this.httpsRequest(endpoint);
          if (result && (result.devices || result.length > 0)) {
            break;
          }
        } catch (e) {
          console.log('[BiometryHandler] Endpoint falhou:', endpoint, e.message);
        }
      }
      
      // Processar resultado
      let devices = [];
      if (result && Array.isArray(result)) {
        devices = result;
      } else if (result && result.devices && Array.isArray(result.devices)) {
        devices = result.devices;
      }
      
      if (devices.length > 0) {
        console.log('[BiometryHandler] ✅ Dispositivos encontrados:', devices.length);
        this.sendMessage('devices-enumerated', { devices: devices });
        return { success: true, devices: devices };
      } else {
        console.log('[BiometryHandler] ⚠️ Nenhum dispositivo encontrado nos endpoints');
        // Mesmo sem dispositivos, retornar sucesso para manter app funcionando
        return { success: true, devices: [], message: 'Nenhum dispositivo conectado' };
      }
    } catch (error) {
      console.error('[BiometryHandler] Erro ao enumerar:', error.message);
      
      return {
        success: true,
        devices: [],
        message: 'WebSDK respondeu mas sem dispositivos',
        hint: 'Verifique se o leitor está conectado'
      };
    }
  }

  /**
   * Inicia captura de impressão digital
   */
  async startAcquisition(deviceId = null) {
    try {
      console.log('[BiometryHandler] Iniciando captura...', deviceId);
      
      const payload = deviceId ? { deviceId } : {};
      const result = await this.httpsRequest('/api/acquisition/start', 'POST', payload);
      
      if (result.success !== false) {
        console.log('[BiometryHandler] ✅ Captura iniciada');
        this.sendMessage('acquisition-started', { success: true });
        return { success: true };
      } else {
        throw new Error(result.error || 'Falha ao iniciar captura');
      }
    } catch (error) {
      console.error('[BiometryHandler] Erro ao iniciar captura:', error.message);
      this.sendMessage('acquisition-error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Para captura de impressão digital
   */
  async stopAcquisition() {
    try {
      console.log('[BiometryHandler] Parando captura...');
      
      const result = await this.httpsRequest('/api/acquisition/stop', 'POST');
      
      console.log('[BiometryHandler] ✅ Captura parada');
      this.sendMessage('acquisition-stopped', { success: true });
      return { success: true };
    } catch (error) {
      console.error('[BiometryHandler] Erro ao parar captura:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica status do SDK
   */
  async checkStatus() {
    try {
      console.log('[BiometryHandler] Verificando status...');
      
      const result = await this.httpsRequest('/api/status');
      
      console.log('[BiometryHandler] Status:', result);
      return result || { success: true, status: 'online' };
    } catch (error) {
      console.error('[BiometryHandler] Erro ao verificar status:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Tenta iniciar o serviço WebSDK (placeholder)
   * Caso não seja possível iniciar automaticamente, retorna erro controlado
   */
  async startService() {
    try {
      // Não há binário local para iniciar via código; apenas verifica status
      const status = await this.checkStatus();
      if (status && status.success !== false) {
        return { success: true, status };
      }
      return { success: false, error: 'WebSDK não pôde ser iniciado automaticamente' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia mensagem para renderer
   */
  sendMessage(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// Função de inicialização
function initBiometry(mainWindow) {
  console.log('[BiometryHandler] ✅ Inicializando biometry handler...');
  return new BiometryHandler(mainWindow);
}

module.exports = { BiometryHandler, initBiometry };
