import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  FileWarning, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  Calendar,
  Search,
  Download,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { loadRespostas, getFormulariosIncompletos, getMunicipiosDuplicados } from '../utils/dataLoader';
import type { FormularioIncompleto } from '../utils/dataLoader';
import type { MunicipioDuplicado } from '../types';

export function FormulariosIncompletos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formularios, setFormularios] = useState<FormularioIncompleto[]>([]);
  const [duplicados, setDuplicados] = useState<MunicipioDuplicado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstituicao, setFilterInstituicao] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'incompletos' | 'duplicados'>('incompletos');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'incompletos' && senha === 'einstein@123') {
      setIsAuthenticated(true);
      setError('');
      loadData();
    } else {
      setError('Login ou senha incorretos');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const respostas = await loadRespostas();
      const incompletos = getFormulariosIncompletos(respostas);
      const duplicadosData = getMunicipiosDuplicados(respostas);
      setFormularios(incompletos);
      setDuplicados(duplicadosData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFormularios = formularios.filter(f => {
    const matchSearch = 
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.municipios.some(m => m.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.drs.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchInstituicao = !filterInstituicao || f.instituicao === filterInstituicao;
    
    return matchSearch && matchInstituicao;
  });

  const exportCSV = () => {
    const headers = ['Record ID', 'Nome', 'Cargo', 'Email', 'Telefone', 'Instituição', 'DRS', 'Municípios', 'Data/Hora'];
    const rows = filteredFormularios.map(f => [
      f.recordId,
      f.nome,
      f.cargo,
      f.email,
      f.telefone,
      f.instituicao,
      f.drs,
      f.municipios.join('; '),
      f.timestamp
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `formularios_incompletos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="bg-amber-100 p-4 rounded-full mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Área Restrita</h1>
            <p className="text-slate-500 text-center mt-2">
              Acesso aos formulários incompletos requer autenticação
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Digite o login"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-10"
                  placeholder="Digite a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${activeTab === 'incompletos' ? 'bg-amber-100' : 'bg-red-100'}`}>
            {activeTab === 'incompletos' ? (
              <FileWarning className="w-6 h-6 text-amber-600" />
            ) : (
              <Copy className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'incompletos' ? 'Formulários Incompletos' : 'Respostas Duplicadas'}
            </h1>
            <p className="text-slate-500">
              {activeTab === 'incompletos' 
                ? `${filteredFormularios.length} formulário(s) pendente(s) de preenchimento`
                : `${duplicados.length} município(s)/DRS com múltiplas respostas`
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </motion.div>

      {/* Abas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        <button
          onClick={() => setActiveTab('incompletos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'incompletos'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 hover:bg-amber-50'
          }`}
        >
          <FileWarning className="w-4 h-4" />
          Incompletos ({formularios.length})
        </button>
        <button
          onClick={() => setActiveTab('duplicados')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'duplicados'
              ? 'bg-red-600 text-white'
              : 'bg-white text-slate-600 hover:bg-red-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Duplicados ({duplicados.length})
        </button>
      </motion.div>

      {/* Filtros - apenas para incompletos */}
      {activeTab === 'incompletos' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4"
        >
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, email, município ou DRS..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <select
            value={filterInstituicao}
            onChange={(e) => setFilterInstituicao(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Todas Instituições</option>
            <option value="Municipio">Município</option>
            <option value="DRS">DRS</option>
          </select>
        </motion.div>
      )}

      {/* Lista de Formulários ou Duplicados */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : activeTab === 'incompletos' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredFormularios.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <FileWarning className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum formulário incompleto encontrado</p>
            </div>
          ) : (
            filteredFormularios.map((f, idx) => (
              <motion.div
                key={f.recordId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">{f.nome || 'Nome não informado'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.instituicao === 'DRS' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {f.instituicao}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                      {f.cargo && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{f.cargo}</span>
                        </div>
                      )}
                      {f.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <a href={`mailto:${f.email}`} className="text-blue-600 hover:underline">{f.email}</a>
                        </div>
                      )}
                      {f.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{f.telefone}</span>
                        </div>
                      )}
                      {f.drs && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{f.drs}</span>
                        </div>
                      )}
                    </div>
                    
                    {f.municipios.length > 0 && (
                      <div className="mt-2 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {f.municipios.map((m, i) => (
                            <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {f.timestamp || 'Data não disponível'}
                    </span>
                    <span className="text-xs text-slate-400">
                      ID: {f.recordId}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      ) : (
        /* Aba de Duplicados */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Aviso sobre duplicados */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Ação Necessária</h3>
                <p className="text-sm text-red-700 mt-1">
                  Os municípios/DRS abaixo possuem múltiplos questionários respondidos por respondentes diferentes. 
                  É necessário encaminhar e-mail sinalizando os múltiplos preenchimentos e questionando qual deverá ser considerado válido.
                </p>
              </div>
            </div>
          </div>

          {duplicados.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <Copy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma resposta duplicada encontrada</p>
            </div>
          ) : (
            duplicados.map((d, idx) => (
              <motion.div
                key={d.municipio}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border-l-4 border-red-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-slate-800 text-lg">{d.municipio}</span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {d.respostas.length} respostas
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {d.respostas.map((r, i) => (
                    <div 
                      key={r.recordId} 
                      className={`p-3 rounded-lg ${i === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-700">{r.nomeRespondente || 'Nome não informado'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.instituicao === 'DRS' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.instituicao}
                            </span>
                            {i === 0 && (
                              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                Mais recente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {r.timestamp || 'Data não disponível'}
                            </span>
                            <span>ID: {r.recordId}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 ml-6">
                          {r.cargo && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{r.cargo}</span>
                            </div>
                          )}
                          {r.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
