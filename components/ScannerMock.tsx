import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, CheckCircle, AlertCircle, RefreshCw, Usb } from 'lucide-react';
import { biometryService } from '../services/biometry';
import { SampleFormat } from '../types';
import { debug, error as logError } from '../services/logger';

interface ScannerMockProps {
  onScanSuccess: (hash: string, template?: string) => void;
  onScanError?: (msg: string) => void;
  label?: string;
  isVerifying?: boolean;
  allowSimulation?: boolean;
  showServiceControls?: boolean;
  onRefreshDevices?: (devices: string[]) => void;
}

export const ScannerMock: React.FC<ScannerMockProps> = ({ 
  onScanSuccess, 
  onScanError, 
  label = 'Posicione o dedo no leitor', 
  isVerifying = false, 
  allowSimulation = false, 
  showServiceControls = false,
  onRefreshDevices 
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [deviceMessage, setDeviceMessage] = useState<string>('Inicializando...');
  const [fingerImage, setFingerImage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const onRefreshDevicesRef = useRef(onRefreshDevices);

  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);
  useEffect(() => { onRefreshDevicesRef.current = onRefreshDevices; }, [onRefreshDevices]);

  useEffect(() => {
    isMounted.current = true;
    biometryService.isSdkLoaded() ? initializeRealDevice() : (setDeviceMessage('IPC do Electron não disponível.'), setStatus('ERROR'));
    return () => { isMounted.current = false; biometryService.stopAcquisition().catch(() => {}); };
  }, []);

  const initializeRealDevice = async () => {
    try {
      if (!biometryService.isSdkLoaded()) throw new Error('SDK_NOT_LOADED');
      setDeviceMessage('Buscando leitor...');
      setStatus('IDLE');
      
      // Registrar listener PRIMEIRO, antes de iniciar aquisição
      biometryService.setListener({
        onDeviceConnected: () => {
          console.log('[ScannerMock] Device conectado');
          setDeviceMessage('Leitor Conectado.');
        },
        onDeviceDisconnected: () => {
          console.log('[ScannerMock] Device desconectado');
          setDeviceMessage('Leitor Desconectado.');
          setStatus('ERROR');
        },
        onSamplesAcquired: (s: any) => {
          console.log('[ScannerMock] Amostra capturada:', s);
          if (isMounted.current) {
            setStatus('SUCCESS');
            setDeviceMessage('Leitura OK!');
            if (s && s.samples) {
              if (typeof s.samples === 'string' && s.samples.startsWith('data:image')) {
                setFingerImage(s.samples);
              }
              
              // Usar HASH COMPLETO dos dados biométricos
              // Isso garante unicidade entre diferentes pessoas
              const sampleStr = typeof s.samples === 'string' 
                ? s.samples
                : JSON.stringify(s.samples);
              
              console.log('[ScannerMock] Gerando hash SHA-256 do template COMPLETO, tamanho:', sampleStr.length);
              
              // Gerar hash SHA-256 do template COMPLETO
              const generateFullHash = async (data: string): Promise<string> => {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return `BIO_${hashHex}`;
              };
              
              generateFullHash(sampleStr).then(hash => {
                if (isMounted.current) {
                  console.log('[ScannerMock] Hash completo gerado:', hash);
                  onScanSuccessRef.current(hash, sampleStr);
                  setStatus('IDLE');
                  setFingerImage(null);
                  setDeviceMessage('Pronto. Posicione o dedo.');
                }
              });
            }
          }
        },
        onErrorOccurred: (e: any) => {
          console.error('[ScannerMock] Erro:', e);
          if (isMounted.current) {
            setStatus('ERROR');
            const msg = e?.message || 'Erro desconhecido';
            setDeviceMessage(msg);
            if (onScanErrorRef.current) onScanErrorRef.current(msg);
          }
        }
      });

      // Configurar formato de amostra - Intermediate/FMD é o melhor para comparação
      biometryService.setSampleFormat(SampleFormat.Intermediate);
      
      // ENTÃO iniciar aquisição (sem deviceId = usa primeiro leitor disponível)
      console.log('[ScannerMock] Iniciando aquisição com formato Raw (binário)...');
      await biometryService.startAcquisition();
      setDeviceMessage('Aguardando dedo...');
      setStatus('IDLE');
    } catch (err: any) {
      console.error('[ScannerMock] Erro na inicialização:', err);
      setStatus('ERROR');
      setDeviceMessage(err?.message === 'NO_DEVICE_FOUND' ? 'Nenhum leitor encontrado.' : err?.message === 'SDK_NOT_LOADED' ? 'Driver não carregado.' : 'Erro ao iniciar.');
    }
  };

  const handleRefreshReader = async () => {
    debug('[ScannerMock] Refresh leitor solicitado');
    setIsRefreshing(true);
    setDeviceMessage('Atualizando leitor...');
    setStatus('IDLE');
    try {
      // Force refresh de dispositivos via biometryService
      const devices = await biometryService.forceRefreshDevices();
      debug('[ScannerMock] Refresh completo, devices:', devices);
      if (onRefreshDevicesRef.current) {
        onRefreshDevicesRef.current(devices);
      }
      // Re-initialize with fresh reader
      if (devices && devices.length > 0) {
        setDeviceMessage('Leitor atualizado.');
        await initializeRealDevice();
      } else {
        setDeviceMessage('Nenhum leitor encontrado após atualização.');
        setStatus('ERROR');
      }
    } catch (e: any) {
      logError('Erro ao atualizar leitor:', e);
      setDeviceMessage('Falha ao atualizar leitor');
      setStatus('ERROR');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckService = async () => {
    setDeviceMessage('Verificando...');
    setStatus('IDLE');
    try {
      const res = await biometryService.checkLocalService();
      if (res && res.ok) {
        setDeviceMessage('Serviço WebSDK online');
        setStatus('IDLE');
        initializeRealDevice().catch(() => {});
      } else {
        setDeviceMessage(`Serviço indisponível`);
        setStatus('ERROR');
      }
    } catch (e: any) {
      logError('Erro ao verificar serviço:', e);
      setDeviceMessage('Falha ao verificar');
      setStatus('ERROR');
    }
  };

  const handleStartService = async () => {
    setDeviceMessage('Iniciando serviço...');
    setStatus('IDLE');
    try {
      const api: any = (window as any).biometry;
      if (!api || typeof api.invoke !== 'function') { setDeviceMessage('Erro: API indisponível'); setStatus('ERROR'); return; }
      const res = await api.invoke({ type: 'start-service' });
      if (res && res.ok) {
        setDeviceMessage('Serviço iniciado!');
        setStatus('IDLE');
        setTimeout(() => { initializeRealDevice().catch(() => {}); }, 1500);
      } else {
        setDeviceMessage('Erro ao iniciar');
        setStatus('ERROR');
      }
    } catch (e: any) {
      logError('Erro ao iniciar serviço:', e);
      setDeviceMessage('Falha ao iniciar');
      setStatus('ERROR');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm mx-auto transition-all">
      <div className={`flex items-center space-x-2 text-gray-500 mb-4 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 mt-2`}>
        <Usb className="h-4 w-4 text-primary-500" />
        <span className="text-xs font-semibold uppercase">Leitor Biométrico</span>
      </div>
      <div className={`relative w-40 h-40 rounded-xl flex items-center justify-center border-2 transition-all duration-300 overflow-hidden ${
        status === 'IDLE' ? 'border-gray-200 bg-gray-50' : status === 'SCANNING' ? 'border-blue-400 bg-blue-50' : status === 'SUCCESS' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}>
        {fingerImage ? (
          <img src={fingerImage} alt="Fingerprint" className="w-full h-full object-contain p-2 opacity-90" />
        ) : (
          <>
            {status === 'IDLE' && <Fingerprint className={`w-16 h-16 text-primary-400 animate-pulse`} />}
            {status === 'SCANNING' && <Fingerprint className="w-16 h-16 text-blue-500 animate-pulse" />}
            {status === 'SUCCESS' && <CheckCircle className="w-16 h-16 text-green-600" />}
            {status === 'ERROR' && <AlertCircle className="w-16 h-16 text-red-600" />}
          </>
        )}
      </div>
      <div className="mt-4 text-center w-full">
        <h3 className={`font-semibold break-words px-2 text-sm min-h-[1.25rem] ${status === 'ERROR' ? 'text-red-600' : 'text-gray-800'}`}>
          {status === 'SCANNING' ? 'Lendo digital...' : status === 'SUCCESS' ? 'Leitura OK!' : deviceMessage}
        </h3>
        <p className="text-xs text-gray-600 mt-1">{label}</p>
        <div className="mt-3 flex items-center justify-center space-x-2">
          <button 
            onClick={handleRefreshReader}
            disabled={isRefreshing}
            className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-1"
            title="Atualizar leitor (detecta desconexões)"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Leitor
          </button>
        </div>
        {showServiceControls && (
          <div className="mt-2 flex items-center justify-center space-x-2">
            <button onClick={handleCheckService} className="px-3 py-1 text-xs font-medium bg-primary-700 text-white rounded hover:bg-primary-600">Verificar Serviço</button>
            <button onClick={handleStartService} className="px-3 py-1 text-xs font-medium bg-orange-600 text-white rounded hover:bg-orange-500">Iniciar Serviço</button>
          </div>
        )}
      </div>
    </div>
  );
};
