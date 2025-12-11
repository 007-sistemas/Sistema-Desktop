
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StorageService } from './services/storage';
import { biometryService } from './services/biometry';
import { BiometriaManager } from './views/BiometriaManager';
import { PontoMachine } from './views/PontoMachine';
import { Login } from './views/Login';
import { HospitalPermissions } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState('ponto');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPermissions, setUserPermissions] = useState<HospitalPermissions | null>(null);

  useEffect(() => {
    StorageService.init();
    const session = StorageService.getSession();
    // Ensure local WebSDK service is running when app starts (try to auto-start if not)
    (async () => {
      try {
        const check = await biometryService.checkLocalService();
        if (!check || !check.ok) {
          const api: any = (window as any).biometry;
          if (api && typeof api.invoke === 'function') {
            try {
              await api.invoke({ type: 'start-service' });
              // give service a moment to be ready
              await new Promise(r => setTimeout(r, 1200));
            } catch (e) {
              console.warn('[App] Não foi possível iniciar serviço automaticamente:', e);
            }
          }
        }
      } catch (e) {
        console.warn('[App] Erro ao verificar/iniciar WebSDK:', e);
      }
    })();
    if (session) {
      setIsAuthenticated(true);
      setUserPermissions(session.permissions);
      if (!session.permissions[currentView as keyof HospitalPermissions]) {
        const firstAllowed = Object.keys(session.permissions).find(k => session.permissions[k as keyof HospitalPermissions]);
        if (firstAllowed) setCurrentView(firstAllowed);
      }
    }
  }, []);

  const handleLoginSuccess = (permissions: HospitalPermissions) => {
    setIsAuthenticated(true);
    setUserPermissions(permissions);
    const firstAllowed = Object.keys(permissions).find(k => permissions[k as keyof HospitalPermissions]);
    if (firstAllowed) setCurrentView(firstAllowed);
    else setCurrentView('dashboard');
  };

  const handleLogout = () => {
    StorageService.clearSession();
    setUserPermissions(null);
    setIsAuthenticated(false);
    setCurrentView('ponto'); 
  };

  const handleChangeView = (view: string) => {
    if (userPermissions && userPermissions[view as keyof HospitalPermissions]) {
      setCurrentView(view);
    } else {
      alert("Acesso negado a este módulo.");
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    if (userPermissions && !userPermissions[currentView as keyof HospitalPermissions]) {
        return <div className="p-10 text-center text-gray-500">Acesso não autorizado.</div>;
    }
    switch(currentView) {
      case 'ponto': return <PontoMachine />;
      case 'biometria': return <BiometriaManager />;
      default: return <PontoMachine />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={handleChangeView} 
      onLogout={handleLogout}
      permissions={userPermissions || undefined}
    >
      {renderView()}
    </Layout>
  );
}
