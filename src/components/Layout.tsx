import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users,
  BarChart3,
  Database,
  FileWarning
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/',
    description: 'Visão geral'
  },
  { 
    label: 'Busca Ativa', 
    icon: Users, 
    path: '/busca-ativa',
    description: 'Acompanhamento'
  },
  { 
    label: 'Análise', 
    icon: BarChart3, 
    path: '/analise',
    description: 'Respostas'
  },
  { 
    label: 'Base de Dados', 
    icon: Database, 
    path: '/base-dados',
    description: 'Visualização'
  },
  { 
    label: 'Formulários Incompletos', 
    icon: FileWarning, 
    path: '/formularios-incompletos',
    description: 'Pendentes'
  },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar - Cor esverdeada */}
      <aside className="w-64 bg-gradient-to-b from-teal-700 via-teal-600 to-emerald-700 text-white flex flex-col">
        {/* Logo Einstein + Projeto Regulação */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src="/logos/einstein.png" 
              alt="Einstein" 
              className="h-14 w-14 object-contain"
/>
            <div>
              <h1 className="font-bold text-lg leading-tight">Projeto</h1>
              <p className="text-sm text-teal-100">Regulação</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="text-xs font-semibold text-teal-200 uppercase tracking-wider mb-3 px-3">
            Menu
          </p>
          
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white text-teal-800 shadow-lg' 
                    : 'text-teal-50 hover:bg-white/10'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-teal-600' : ''}`} />
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className={`text-xs ${isActive ? 'text-teal-500' : 'text-teal-200'}`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer com Logos - Fundo branco */}
        <div className="p-3 border-t border-white/10">
          <div className="bg-white rounded-xl p-3 shadow-lg">
            <p className="text-xs font-medium text-slate-500 mb-2 text-center">Parceria</p>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-3">
                <img 
                  src="/logos/einstein.png" 
                  alt="Einstein" 
                  className="h-10 object-contain"
                />
                <img 
                  src="/logos/opas.png" 
                  alt="OPAS" 
                  className="h-10 object-contain"
                />
              </div>
              <img 
                src="/logos/ESP.png" 
                alt="ESP" 
                className="h-12 object-contain"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-slate-500">
                Diagnóstico de Regulação em Saúde • Estado de São Paulo
              </p>
            </div>
            <div className="flex items-center gap-4">
              <img 
                src="/logos/einstein.png" 
                alt="Einstein" 
                className="h-10 object-contain"
              />
              <img 
                src="/logos/opas.png" 
                alt="OPAS" 
                className="h-14 object-contain"
              />
              <img 
                src="/logos/ESP.png" 
                alt="ESP" 
                className="h-10 object-contain"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
