
import React, { useState, useEffect } from 'react';
import { Cooperado, Biometria } from '../types';
import { StorageService } from '../services/storage';
import { biometryService } from '../services/biometry';
import { ScannerMock } from '../components/ScannerMock';
import { BiometricCapture } from './BiometricCapture'; // Importando a view de diagnóstico como componente
import { Trash2, AlertTriangle, Fingerprint, Users, Activity } from 'lucide-react';

export const BiometriaManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gestao' | 'diagnostico'>('gestao');
  const [cooperados, setCooperados] = useState<Cooperado[]>([]);
  const [selectedCooperadoId, setSelectedCooperadoId] = useState<string>('');
  
  useEffect(() => {
    setCooperados(StorageService.getCooperados());
  }, []);

  // Limpar aquisição ao trocar de aba (evita captura concorrente)
  useEffect(() => {
    return () => {
      // Ao desmontar ou trocar aba, parar qualquer aquisição em andamento
      biometryService.stopAcquisition().catch(() => {});
    };
  }, [activeTab]);

  const selectedCooperado = cooperados.find(c => c.id === selectedCooperadoId);

  const handleDeleteAllBiometrics = () => {
    if (!selectedCooperado) return;
    
    if (!confirm(`Tem certeza que deseja apagar TODAS as ${selectedCooperado.biometrias.length} digitais de ${selectedCooperado.nome}?`)) {
      return;
    }

    const updatedCooperado = {
      ...selectedCooperado,
      biometrias: []
    };

    StorageService.saveCooperado(updatedCooperado);
    StorageService.logAudit('EXCLUSAO_BIOMETRIAS', `Todas as biometrias de ${selectedCooperado.nome} foram apagadas`);
    
    // Atualizar estado local
    setCooperados(prev => prev.map(c => c.id === updatedCooperado.id ? updatedCooperado : c));
    
    console.log('[BiometriaManager] 🗑️ Todas as digitais de', selectedCooperado.nome, 'foram apagadas');
  };

  const handleScanSuccess = (hash: string, template?: string) => {
    if (!selectedCooperado) return;

    console.log('[BiometriaManager] 📝 Cadastrando biometria (modo treinamento)...');
    console.log('[BiometriaManager] Hash recebido:', hash.substring(0, 40) + '...');
    console.log('[BiometriaManager] Cooperado:', selectedCooperado.nome);
    console.log('[BiometriaManager] Biometrias já cadastradas:', selectedCooperado.biometrias.length);

    // Verificar se já existe esse hash (evitar duplicatas exatas)
    const jaExiste = selectedCooperado.biometrias.some(bio => bio.hash === hash);
    if (jaExiste) {
      console.log('[BiometriaManager] ⚠️ Hash já cadastrado, tente novamente');
      alert('Esta leitura já foi cadastrada. Posicione o dedo novamente.');
      return;
    }

    const newBiometria: Biometria = {
      id: crypto.randomUUID(),
      fingerIndex: selectedCooperado.biometrias.length + 1,
      hash: hash,
      template: template,
      createdAt: new Date().toISOString()
    };

    const updatedCooperado = {
      ...selectedCooperado,
      biometrias: [...selectedCooperado.biometrias, newBiometria]
    };

    console.log('[BiometriaManager] Biometrias após adicionar:', updatedCooperado.biometrias.length);
    
    // Mensagem de progresso do treinamento
    if (updatedCooperado.biometrias.length < 3) {
      alert(`Amostra ${updatedCooperado.biometrias.length} cadastrada!\n\nRecomendação: Cadastre pelo menos 3 amostras do mesmo dedo para melhor reconhecimento.\n\nRestam: ${3 - updatedCooperado.biometrias.length} amostras`);
    } else if (updatedCooperado.biometrias.length === 3) {
      alert('✅ 3 amostras cadastradas!\n\nO reconhecimento já deve funcionar bem.\n\nVocê pode cadastrar mais 1-2 amostras para aumentar a precisão (opcional).');
    }
    
    StorageService.saveCooperado(updatedCooperado);
    
    // Verificar se salvou
    const verificacao = StorageService.getCooperados().find(c => c.id === updatedCooperado.id);
    console.log('[BiometriaManager] ✅ Verificação pós-save - Biometrias salvas:', verificacao?.biometrias.length);
    
    StorageService.logAudit('CADASTRO_BIOMETRIA', `Biometria ${updatedCooperado.biometrias.length} adicionada para ${updatedCooperado.nome}`);
    
    // Refresh local state
    setCooperados(prev => prev.map(c => c.id === updatedCooperado.id ? updatedCooperado : c));
  };

  const deleteBiometria = (bioId: string) => {
    if (!selectedCooperado) return;
    if (!confirm('Remover esta digital? Esta ação é irreversível.')) return;

    const updatedCooperado = {
      ...selectedCooperado,
      biometrias: selectedCooperado.biometrias.filter(b => b.id !== bioId)
    };

    StorageService.saveCooperado(updatedCooperado);
    setCooperados(prev => prev.map(c => c.id === updatedCooperado.id ? updatedCooperado : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Fingerprint className="h-8 w-8 text-primary-600" />
          <div>
             <h2 className="text-2xl font-bold text-gray-800">Biometria & Hardware</h2>
             <p className="text-gray-500">Cadastros e diagnósticos dos leitores</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
            <button
                onClick={() => setActiveTab('gestao')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'gestao' 
                    ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                <Users className="h-4 w-4 mr-2" />
                Gestão de Cadastro
            </button>
            <button
                onClick={() => setActiveTab('diagnostico')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'diagnostico' 
                    ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                <Activity className="h-4 w-4 mr-2" />
                Diagnóstico Técnico
            </button>
        </div>
      </div>

      {activeTab === 'diagnostico' ? (
          <div className="animate-fade-in">
              <BiometricCapture />
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Selection Column */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Cooperado</label>
              <select 
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedCooperadoId}
                onChange={(e) => setSelectedCooperadoId(e.target.value)}
              >
                <option value="">-- Selecione --</option>
                {cooperados.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.matricula})</option>
                ))}
              </select>
              
              {selectedCooperado && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-gray-800">{selectedCooperado.nome}</h4>
                  <p className="text-sm text-gray-500">{selectedCooperado.especialidade}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Digitais cadastradas:</span>
                    <span className="font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      {selectedCooperado.biometrias.length}
                    </span>
                  
                                    {selectedCooperado.biometrias.length > 0 && selectedCooperado.biometrias.length < 3 && (
                                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                                        ⚠️ <strong>Atenção:</strong> Para reconhecimento confiável, cadastre pelo menos <strong>3 amostras</strong> do mesmo dedo.
                                      </div>
                                    )}
                  
                                    {selectedCooperado.biometrias.length >= 3 && (
                                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                        ✓ <strong>Cadastro completo!</strong> O reconhecimento está otimizado.
                                      </div>
                                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Column */}
            <div className="lg:col-span-2 space-y-6">
              {!selectedCooperado ? (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-gray-400">
                  <Fingerprint className="h-12 w-12 mb-2 opacity-50" />
                  <p>Selecione um cooperado para gerenciar digitais</p>
                </div>
              ) : (
                <>
                  {/* Enrollment Area */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Nova Leitura</h3>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <ScannerMock 
                        onScanSuccess={handleScanSuccess} 
                        label="Clique no sensor para capturar"
                        showServiceControls={false}
                      />
                      <div className="text-sm text-gray-600 space-y-2 max-w-xs">
                        <p className="flex items-start">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                          Certifique-se que o sensor esteja limpo.
                        </p>
                        <p>O sistema armazena apenas um hash criptografado, não a imagem da digital.</p>
                      </div>
                    </div>
                  </div>

                  {/* List of Registered Fingerprints */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-semibold text-gray-800">Digitais Ativas</h3>
                       {selectedCooperado.biometrias.length > 0 && (
                         <button
                           onClick={handleDeleteAllBiometrics}
                           className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                           title="Apagar todas as digitais deste cooperado"
                         >
                           <Trash2 className="h-4 w-4" />
                           Apagar Todas
                         </button>
                       )}
                     </div>
                     {selectedCooperado.biometrias.length === 0 ? (
                       <p className="text-gray-500 italic">Nenhuma biometria cadastrada.</p>
                     ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {selectedCooperado.biometrias.map((bio, index) => (
                           <div key={bio.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                             <div className="flex items-center space-x-3">
                               <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm">
                                 <Fingerprint className="h-5 w-5 text-primary-600" />
                               </div>
                               <div>
                                 <p className="text-sm font-medium text-gray-900">Digital #{index + 1}</p>
                                 <p className="text-xs text-gray-500 text-ellipsis overflow-hidden w-24">Hash: {bio.hash.substring(0, 8)}...</p>
                               </div>
                             </div>
                             <button 
                               onClick={() => deleteBiometria(bio.id)}
                               className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                               title="Remover digital"
                             >
                               <Trash2 className="h-4 w-4" />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                </>
              )}
            </div>
          </div>
      )}
    </div>
  );
};
