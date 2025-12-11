
import React from 'react';
import { 
  Users, 
  Fingerprint, 
  ClipboardCheck, 
  Menu,
  LogOut,
} from 'lucide-react';
import { Hospital, HospitalPermissions } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  permissions?: HospitalPermissions; 
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onChangeView, 
  onLogout,
  permissions
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const allNavItems = [
    { id: 'ponto', label: 'Registrar Produção', icon: ClipboardCheck, permissionKey: 'ponto' },
    { id: 'biometria', label: 'Biometria', icon: Fingerprint, permissionKey: 'biometria' },
  ];

  const navItems = allNavItems.filter(item => {
    if (!permissions) return true;
    return permissions[item.permissionKey as keyof HospitalPermissions] === true;
  });

  const handleLogoutClick = () => {
    onLogout();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`bg-primary-900 text-white w-64 flex-shrink-0 hidden md:flex flex-col transition-all duration-300`}>
        <div className="p-6 flex items-center space-x-3 border-b border-primary-800">
          <div className="bg-white p-1 rounded-full">
            <ClipboardCheck className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold">DigitAll</h1>
            <p className="text-xs text-primary-300">Controle de Produção</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-primary-700 text-white shadow-lg' 
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-800">
          <button 
            onClick={handleLogoutClick}
            className="flex items-center space-x-2 text-primary-200 hover:text-white transition-colors text-sm w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="h-6 w-6 text-primary-700" />
            <span className="font-bold text-gray-800">DigitAll</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-primary-900 text-white p-4 space-y-2 absolute w-full z-50">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  currentView === item.id ? 'bg-primary-700' : ''
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="border-t border-primary-800 pt-2 mt-2">
                <button 
                    onClick={handleLogoutClick}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-200 hover:text-white"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
