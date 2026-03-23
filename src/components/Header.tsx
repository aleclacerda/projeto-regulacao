import { Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-sky-500 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-semibold text-slate-800">Regulação em Saúde</h1>
              <p className="text-xs text-slate-500">Projeto OPAS/Einstein/SES-SP</p>
            </div>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-sky-600' 
                  : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              Início
            </Link>
            <Link 
              to="/busca-ativa"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/busca-ativa' 
                  ? 'text-sky-600' 
                  : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              Busca Ativa
            </Link>
            <Link 
              to="/analise"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/analise' 
                  ? 'text-sky-600' 
                  : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              Análise
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <img 
              src="/logos/einstein.svg" 
              alt="Hospital Israelita Albert Einstein" 
              className="h-8 object-contain"
            />
            <img 
              src="/logos/opas.svg" 
              alt="OPAS" 
              className="h-8 object-contain"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
