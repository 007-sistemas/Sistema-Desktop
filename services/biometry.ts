import { SampleFormat, SdkEventListener } from '../types';

export class DigitalPersonaService {
  private reader: any;
  private isConnected: boolean = false;
  private acquisitionStarted: boolean = false;
  private currentFormat: SampleFormat = SampleFormat.PngImage;
  private sdkReadyPromise: Promise<boolean>;
  private sdkReadyResolve!: (value: boolean) => void;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private currentListener: SdkEventListener | null = null;

  constructor() {
    this.sdkReadyPromise = new Promise((resolve) => {
      this.sdkReadyResolve = resolve;
    });
    this.initializeSdkCheck();
    this.setupHealthCheck();
  }

  private initializeSdkCheck() {
    console.log('[BiometryService] Iniciando verificação do SDK...');
    const checkSdk = () => {
      if (this.isSdkLoaded()) {
        console.log('[BiometryService] SDK carregado');
        this.sdkReadyResolve(true);
        return;
      }
      setTimeout(checkSdk, 500);
    };
    checkSdk();
  }

  private setupHealthCheck() {
    // Health check a cada 10 segundos para detectar desconexões
    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected && this.reader) {
        this.verifyConnection();
      }
    }, 10000);
  }

  private async verifyConnection() {
    try {
      // Tenta enumerar devices para verificar se conexão está viva
      const devices = await this.reader.enumerateDevices();
      if (!Array.isArray(devices) || devices.length === 0) {
        console.warn('[BiometryService] ⚠️ Nenhum device detectado, posível desconexão');
        this.handleConnectionLoss();
      }
    } catch (error) {
      console.error('[BiometryService] ❌ Health check falhou:', error);
      this.handleConnectionLoss();
    }
  }

  private handleConnectionLoss() {
    console.log('[BiometryService] Tratando perda de conexão...');
    this.isConnected = false;
    this.acquisitionStarted = false;
    this.resetReader();
    this.attemptReconnect();
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BiometryService] ❌ Máximo de tentativas de reconexão atingido');
      this.reconnectAttempts = 0;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Backoff exponencial
    console.log(`[BiometryService] Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay}ms...`);

    setTimeout(async () => {
      try {
        await this.enumerateDevices();
        console.log('[BiometryService] ✅ Reconectado com sucesso!');
        this.reconnectAttempts = 0;
      } catch (error) {
        console.warn('[BiometryService] Reconexão falhou, tentando novamente...', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  public async waitForSdkReady(timeoutMs: number = 5000): Promise<boolean> {
    return Promise.race([
      this.sdkReadyPromise,
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      })
    ]);
  }

  public isSdkLoaded(): boolean {
    const hasSdk = typeof window.Fingerprint !== 'undefined' && 
                   typeof window.Fingerprint.WebApi !== 'undefined';
    return hasSdk;
  }

  private getReader() {
    // Se reader foi criado e está conectado, reutiliza
    if (this.reader && this.isConnected) {
      return this.reader;
    }

    // Caso contrário, reseta e cria novo
    if (!this.isSdkLoaded()) {
      console.error('[BiometryService] SDK não encontrado');
      return null;
    }

    try {
      console.log('[BiometryService] Criando nova instância de WebApi...');
      this.reader = new window.Fingerprint.WebApi();
      console.log('[BiometryService] ✅ WebApi criada com sucesso');
      
      // Reconfigurar listeners se houver
      if (this.currentListener) {
        this.setListener(this.currentListener);
      }
      
      return this.reader;
    } catch (e) {
      console.error('[BiometryService] ❌ Erro ao criar WebApi', e);
      this.reader = null;
      throw e;
    }
  }

  private resetReader() {
    console.log('[BiometryService] Resetando reader...');
    if (this.reader) {
      try {
        // Tentar limpar recursos
        if (this.acquisitionStarted) {
          this.reader.stopAcquisition().catch(() => {});
        }
      } catch (e) {
        console.warn('[BiometryService] Erro ao limpar reader:', e);
      }
    }
    this.reader = null;
    this.acquisitionStarted = false;
    this.isConnected = false;
  }

  public async enumerateDevices(): Promise<string[]> {
    const reader = this.getReader();
    if (!reader) return [];
    try {
      console.log('[BiometryService] Enumerando dispositivos...');
      const devices = await reader.enumerateDevices();
      if (Array.isArray(devices)) {
        return devices.filter(d => d && typeof d === 'string');
      }
      return [];
    } catch (e) {
      console.error('[BiometryService] Erro ao enumerar:', e);
      return [];
    }
  }

  public async startAcquisition(format: SampleFormat = SampleFormat.PngImage, deviceUid?: string): Promise<string> {
    const reader = this.getReader();
    if (!reader) throw new Error("SDK_NOT_LOADED");

    if (this.acquisitionStarted) {
      await this.stopAcquisition();
    }

    let targetUid = deviceUid;
    if (!targetUid) {
      const devices = await this.enumerateDevices();
      if (devices && devices.length > 0) {
        targetUid = devices[0];
      } else {
        throw new Error("NO_DEVICE_FOUND");
      }
    }

    this.currentFormat = format;
    try {
      await reader.startAcquisition(format, targetUid);
      this.acquisitionStarted = true;
      this.isConnected = true;
      console.log('[BiometryService] Aquisição iniciada');
      return targetUid;
    } catch (error) {
      this.acquisitionStarted = false;
      this.isConnected = false;
      console.error('[BiometryService] Erro ao iniciar', error);
      // Resetar reader se houver erro na inicialização
      this.resetReader();
      throw error;
    }
  }

  public async stopAcquisition(): Promise<void> {
    const reader = this.getReader();
    if (!reader) return;
    try {
      await reader.stopAcquisition();
      this.acquisitionStarted = false;
      console.log('[BiometryService] Aquisição parada');
    } catch (error) {
      console.warn('[BiometryService] Erro ao parar, resetando reader:', error);
      // Se houver erro ao parar, resetar a reader para próxima tentativa
      this.resetReader();
    }
  }

  public setListener(listener: SdkEventListener) {
    // Armazenar listener para reconectar depois
    this.currentListener = listener;
    
    const reader = this.getReader();
    if (!reader) return;

    reader.onDeviceConnected = (e: any) => {
      console.log('[BiometryService] ✅ Device conectado');
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset reconexão ao conectar
      if (listener.onDeviceConnected) listener.onDeviceConnected(e);
    };

    reader.onDeviceDisconnected = (e: any) => {
      console.log('[BiometryService] ❌ Device desconectado');
      this.isConnected = false;
      this.acquisitionStarted = false;
      this.handleConnectionLoss(); // Tentar reconectar
      if (listener.onDeviceDisconnected) listener.onDeviceDisconnected(e);
    };

    reader.onQualityReported = (e: any) => {
      if (listener.onQualityReported) listener.onQualityReported(e);
    };

    reader.onErrorOccurred = (e: any) => {
      console.error('[BiometryService] ❌ Erro:', e);
      this.acquisitionStarted = false;
      if (listener.onErrorOccurred) listener.onErrorOccurred(e);
    };

    reader.onSamplesAcquired = (s: any) => {
      try {
        const Fingerprint = window.Fingerprint;
        if (!Fingerprint) return;
        let samples = s.samples;
        if (typeof samples === 'string') {
          try {
            samples = JSON.parse(samples);
          } catch (e) {}
        }
        if (!Array.isArray(samples)) {
          samples = [samples];
        }
        let processedData = "";
        if (samples && samples.length > 0) {
          const raw = samples[0];
          if (this.currentFormat === SampleFormat.PngImage) {
            let b64 = raw;
            try {
              b64 = Fingerprint.b64UrlTo64(raw);
            } catch (e) {}
            if (!/^data:/.test(b64)) {
              processedData = "data:image/png;base64," + b64;
            } else {
              processedData = b64;
            }
          } else {
            processedData = raw;
          }
        }
        if (listener.onSamplesAcquired) {
          listener.onSamplesAcquired({ samples: processedData });
        }
      } catch (e) {
        console.error("[BiometryService] Erro ao processar", e);
      }
    };
  }

  public cleanup() {
    console.log('[BiometryService] Limpando recursos...');
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.acquisitionStarted) {
      this.stopAcquisition().catch(() => {});
    }
    this.resetReader();
  }
}

export const biometryService = new DigitalPersonaService();
