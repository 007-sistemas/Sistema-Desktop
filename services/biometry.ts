import { SampleFormat, SdkEventListener } from '../types';

export class DigitalPersonaService {
  private reader: any;
  private isConnected: boolean = false;
  private acquisitionStarted: boolean = false;
  private currentFormat: SampleFormat = SampleFormat.Raw;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentListener: SdkEventListener | null = null;

  constructor() {
    this.initializeService();
    this.setupHealthCheck();
  }

  /**
   * Inicializa o serviço
   */
  private initializeService() {
    const api: any = (window as any).biometry;
    if (api && typeof api.invoke === 'function') {
      console.log('[BiometryService] ✅ API nativa disponível via preload');
    } else {
      console.log('[BiometryService] ⚠️ API nativa não disponível');
    }
  }

  /**
   * Obtém ou cria instância do reader
   */
  private getReader(): any {
    if (!this.reader) {
      const Fingerprint: any = (window as any).Fingerprint;
      if (!Fingerprint || !Fingerprint.WebApi) {
        throw new Error('SDK Fingerprint.WebApi não disponível');
      }

      console.log('[BiometryService] Criando nova instância do WebApi reader...');
      this.reader = new Fingerprint.WebApi();
      
      // Configurar listeners do SDK
      if (this.currentListener) {
        this.reader.onSamplesAcquired = this.currentListener.onSamplesAcquired;
        this.reader.onDeviceConnected = this.currentListener.onDeviceConnected;
        this.reader.onDeviceDisconnected = this.currentListener.onDeviceDisconnected;
        this.reader.onQualityReported = this.currentListener.onQualityReported;
        this.reader.onErrorOccurred = this.currentListener.onErrorOccurred;
      }
    }
    return this.reader;
  }

  /**
   * Health check periódico
   */
  private setupHealthCheck() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.enumerateDevices();
      } catch (error) {
        if (this.isConnected) {
          console.warn('[BiometryService] ⚠️ SDK não respondeu:', error);
          this.isConnected = false;
        }
      }
    }, 10000);
  }

  /**
   * Enumera leitores biométricos disponíveis
   */
  public async enumerateDevices(): Promise<any[]> {
    try {
      console.log('[BiometryService] 🔍 Enumerando leitores via SDK JavaScript...');
      
      const reader = this.getReader();
      const devices = await reader.enumerateDevices();

      console.log('[BiometryService] ✅ Leitores encontrados:', devices.length);
      this.isConnected = devices.length > 0;
      
      return devices || [];
    } catch (error: any) {
      console.error('[BiometryService] Erro ao enumerar leitores:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Inicia captura de impressão digital
   */
  public async startAcquisition(deviceId?: string): Promise<boolean> {
    try {
      console.log('[BiometryService] 🟢 Iniciando captura de impressão...');

      const reader = this.getReader();
      await reader.startAcquisition(this.currentFormat, deviceId);
      
      console.log('[BiometryService] ✅ Captura iniciada com sucesso');
      this.acquisitionStarted = true;
      return true;
    } catch (error: any) {
      console.error('[BiometryService] ❌ Erro ao iniciar captura:', error.message);
      this.acquisitionStarted = false;

      if (this.currentListener?.onErrorOccurred) {
        this.currentListener.onErrorOccurred(error);
      }

      throw error;
    }
  }

  /**
   * Para captura de impressão digital
   */
  public async stopAcquisition(): Promise<boolean> {
    try {
      if (!this.acquisitionStarted) {
        console.log('[BiometryService] ⚠️ Nenhuma captura em andamento');
        return false;
      }

      console.log('[BiometryService] 🔴 Parando captura...');

      if (!this.reader) {
        throw new Error('Reader não inicializado');
      }

      await this.reader.stopAcquisition();
      console.log('[BiometryService] ✅ Captura parada');
      this.acquisitionStarted = false;
      return true;
    } catch (error: any) {
      console.error('[BiometryService] Erro ao parar captura:', error.message);
      throw error;
    }
  }

  /**
   * Registra listener para eventos de biometria
   */
  public addListener(listener: SdkEventListener): void {
    this.currentListener = listener;
    
    // Se reader já existe, atualizar os listeners
    if (this.reader) {
      this.reader.onSamplesAcquired = listener.onSamplesAcquired;
      this.reader.onDeviceConnected = listener.onDeviceConnected;
      this.reader.onDeviceDisconnected = listener.onDeviceDisconnected;
      this.reader.onQualityReported = listener.onQualityReported;
      this.reader.onErrorOccurred = listener.onErrorOccurred;
    }
    
    console.log('[BiometryService] 📡 Listener registrado');
  }

  /**
   * Alias para addListener (compatibilidade)
   */
  public setListener(listener: SdkEventListener): void {
    this.addListener(listener);
  }

  /**
   * Remove listener
   */
  public removeListener(): void {
    this.currentListener = null;
    console.log('[BiometryService] 📡 Listener removido');
  }

  /**
   * Verifica se há leitor conectado
   */
  public isReaderConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Verifica se está capturando
   */
  public isAcquiring(): boolean {
    return this.acquisitionStarted;
  }

  /**
   * Obtém status atual do serviço
   */
  public async getStatus(): Promise<{ connected: boolean; acquiring: boolean }> {
    try {
      const readers = await this.enumerateDevices();
      return {
        connected: readers.length > 0,
        acquiring: this.acquisitionStarted
      };
    } catch {
      return {
        connected: false,
        acquiring: false
      };
    }
  }

  /**
   * Limpa recursos ao desmontar
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.currentListener = null;
    console.log('[BiometryService] 🗑️ Serviço destruído');
  }

  /**
   * Define formato de amostra
   */
  public setSampleFormat(format: SampleFormat): void {
    this.currentFormat = format;
    console.log('[BiometryService] Formato definido:', format);
  }

  /**
   * Verifica se SDK Fingerprint está carregado
   */
  public isSdkLoaded(): boolean {
    try {
      const win: any = window as any;
      return typeof win.Fingerprint !== 'undefined' && 
             typeof win.Fingerprint.WebApi !== 'undefined';
    } catch (e) {
      return false;
    }
  }

  /**
   * Força atualização completa dos dispositivos (inclui reset do cache)
   */
  public async forceRefreshDevices(): Promise<any[]> {
    try {
      console.log('[BiometryService] 🔄 Força refresh: reset completo e re-enumeração...');
      
      // Parar qualquer captura em andamento
      if (this.acquisitionStarted) {
        try {
          await this.stopAcquisition();
        } catch (e) {
          console.warn('[BiometryService] Erro ao parar aquisição durante refresh:', e);
        }
      }
      
      // Reset do reader (limpa cache)
      this.reader = null;
      this.isConnected = false;
      
      // Aguardar liberação de recursos
      await new Promise(r => setTimeout(r, 300));
      
      // Re-enumerar
      const devices = await this.enumerateDevices();
      console.log('[BiometryService] ✅ Refresh completo, dispositivos:', devices);
      return devices;
    } catch (e) {
      console.error('[BiometryService] ❌ Erro durante forceRefreshDevices:', e);
      return [];
    }
  }

  /**
   * Verifica se o serviço WebSDK local está respondendo
   */
  public async checkLocalService(): Promise<{ ok: boolean; status?: any; error?: string }> {
    try {
      const api: any = (window as any).biometry;
      if (!api || typeof api.invoke !== 'function') {
        return { ok: false, error: 'preload-api-missing' };
      }

      const res = await api.invoke({ type: 'check-status' });
      if (res && res.success !== false) {
        return { ok: true, status: res };
      }
      return { ok: false, error: res?.error || 'no-response' };
    } catch (e: any) {
      return { ok: false, error: String(e) };
    }
  }
}

// Instância singleton
export const biometryService = new DigitalPersonaService();

export function getBiometryService(): DigitalPersonaService {
  return biometryService;
}

export function resetBiometryService(): void {
  biometryService.destroy();
}
