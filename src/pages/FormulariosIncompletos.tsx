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
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  List
} from 'lucide-react';
import { 
  loadRespostas, 
  getFormulariosIncompletos, 
  getMunicipiosDuplicados,
  getMunicipiosComStatus,
  getDRSComStatus,
  loadMunicipios
} from '../utils/dataLoader';
import type { FormularioIncompleto, MunicipioComInfo, DRSComStatus } from '../utils/dataLoader';
import type { MunicipioDuplicado } from '../types';

export function FormulariosIncompletos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formularios, setFormularios] = useState<FormularioIncompleto[]>([]);
  const [duplicados, setDuplicados] = useState<MunicipioDuplicado[]>([]);
  const [municipiosStatus, setMunicipiosStatus] = useState<MunicipioComInfo[]>([]);
  const [drsStatus, setDrsStatus] = useState<DRSComStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstituicao, setFilterInstituicao] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'incompletos' | 'duplicados' | 'lista'>('incompletos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'completo' | 'incompleto' | 'pendente'>('todos');
  const [filterTipo, setFilterTipo] = useState<'municipios' | 'drs'>('municipios');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'einstein' && senha === 'einstein@') {
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
      const municipiosBase = await loadMunicipios();
      const incompletos = getFormulariosIncompletos(respostas);
      const duplicadosData = getMunicipiosDuplicados(respostas);
      const municipiosComStatus = getMunicipiosComStatus(respostas, municipiosBase);
      const drsComStatus = getDRSComStatus(respostas);
      setFormularios(incompletos);
      setDuplicados(duplicadosData);
      setMunicipiosStatus(municipiosComStatus);
      setDrsStatus(drsComStatus);
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
    if (activeTab === 'incompletos') {
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
    } else if (activeTab === 'duplicados') {
      const headers = ['Município/DRS', 'Qtd Respostas', 'Record ID', 'Nome Respondente', 'Cargo', 'Email', 'Instituição', 'Data/Hora'];
      const rows: string[][] = [];
      
      duplicados.forEach(d => {
        d.respostas.forEach((r, i) => {
          rows.push([
            i === 0 ? d.municipio : '',
            i === 0 ? String(d.respostas.length) : '',
            r.recordId,
            r.nomeRespondente,
            r.cargo,
            r.email,
            r.instituicao,
            r.timestamp
          ]);
        });
      });
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell || ''}"`).join(','))
        .join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `respostas_duplicadas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else if (activeTab === 'lista') {
      if (filterTipo === 'municipios') {
        const headers = ['Município', 'DRS', 'RRAS', 'Região de Saúde', 'Status'];
        const rows = filteredMunicipios.map(m => [
          m.nome,
          m.drs,
          m.rras,
          m.regiaoSaude,
          m.status === 'completo' ? 'Completo' : m.status === 'incompleto' ? 'Incompleto' : 'Pendente'
        ]);
        
        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell || ''}"`).join(','))
          .join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `municipios_${filterStatus}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        const headers = ['DRS', 'Status'];
        const rows = filteredDRS.map(d => [
          d.nome,
          d.status === 'completo' ? 'Completo' : d.status === 'incompleto' ? 'Incompleto' : 'Pendente'
        ]);
        
        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell || ''}"`).join(','))
          .join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `drs_${filterStatus}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      }
    }
  };

  // Filtros para lista de municípios
  const filteredMunicipios = municipiosStatus.filter(m => {
    const matchStatus = filterStatus === 'todos' || m.status === filterStatus;
    const matchSearch = !searchTerm || 
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.drs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rras.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.regiaoSaude.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Filtros para lista de DRS
  const filteredDRS = drsStatus.filter(d => {
    const matchStatus = filterStatus === 'todos' || d.status === filterStatus;
    const matchSearch = !searchTerm || d.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Contadores
  const countMunicipios = {
    completo: municipiosStatus.filter(m => m.status === 'completo').length,
    incompleto: municipiosStatus.filter(m => m.status === 'incompleto').length,
    pendente: municipiosStatus.filter(m => m.status === 'pendente').length
  };

  const countDRS = {
    completo: drsStatus.filter(d => d.status === 'completo').length,
    incompleto: drsStatus.filter(d => d.status === 'incompleto').length,
    pendente: drsStatus.filter(d => d.status === 'pendente').length
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
          <div className={`p-3 rounded-xl ${
            activeTab === 'incompletos' ? 'bg-amber-100' : 
            activeTab === 'duplicados' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            {activeTab === 'incompletos' ? (
              <FileWarning className="w-6 h-6 text-amber-600" />
            ) : activeTab === 'duplicados' ? (
              <Copy className="w-6 h-6 text-red-600" />
            ) : (
              <List className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Gerenciamento de Pendências
            </h1>
            <p className="text-slate-500">
              {activeTab === 'incompletos' 
                ? `${filteredFormularios.length} formulário(s) pendente(s) de preenchimento`
                : activeTab === 'duplicados'
                ? `${duplicados.length} município(s)/DRS com múltiplas respostas`
                : filterTipo === 'municipios' 
                  ? `${filteredMunicipios.length} município(s) encontrado(s)`
                  : `${filteredDRS.length} DRS encontrada(s)`
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
        className="flex gap-2 flex-wrap"
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
        <button
          onClick={() => setActiveTab('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'lista'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-blue-50'
          }`}
        >
          <List className="w-4 h-4" />
          Lista por Status
        </button>
      </motion.div>

      {/* Filtros - para incompletos */}
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
      ) : activeTab === 'duplicados' ? (
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
      ) : null}

      {/* Aba Lista por Status */}
      {activeTab === 'lista' && (
        <>
          {/* Filtros para lista */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-4 space-y-4"
          >
            {/* Tipo: Municípios ou DRS */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTipo('municipios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterTipo === 'municipios'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Municípios ({municipiosStatus.length})
              </button>
              <button
                onClick={() => setFilterTipo('drs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterTipo === 'drs'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                DRS ({drsStatus.length})
              </button>
            </div>

            {/* Filtros de status */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={filterTipo === 'municipios' ? "Buscar por município, DRS, RRAS..." : "Buscar por DRS..."}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('todos')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'todos'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus('completo')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'completo'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completos ({filterTipo === 'municipios' ? countMunicipios.completo : countDRS.completo})
                </button>
                <button
                  onClick={() => setFilterStatus('incompleto')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'incompleto'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Incompletos ({filterTipo === 'municipios' ? countMunicipios.incompleto : countDRS.incompleto})
                </button>
                <button
                  onClick={() => setFilterStatus('pendente')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'pendente'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Pendentes ({filterTipo === 'municipios' ? countMunicipios.pendente : countDRS.pendente})
                </button>
              </div>
            </div>
          </motion.div>

          {/* Lista de Municípios */}
          {filterTipo === 'municipios' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Município</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">DRS</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">RRAS</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Região de Saúde</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMunicipios.map((m, idx) => (
                      <tr key={m.nome} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{m.nome}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{m.drs}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{m.rras}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{m.regiaoSaude}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            m.status === 'completo' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : m.status === 'incompleto'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {m.status === 'completo' && <CheckCircle2 className="w-3 h-3" />}
                            {m.status === 'incompleto' && <Clock className="w-3 h-3" />}
                            {m.status === 'pendente' && <XCircle className="w-3 h-3" />}
                            {m.status === 'completo' ? 'Completo' : m.status === 'incompleto' ? 'Incompleto' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredMunicipios.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum município encontrado com os filtros selecionados
                </div>
              )}
            </motion.div>
          )}

          {/* Lista de DRS */}
          {filterTipo === 'drs' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">DRS</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDRS.map((d, idx) => (
                      <tr key={d.nome} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{d.nome}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            d.status === 'completo' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : d.status === 'incompleto'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {d.status === 'completo' && <CheckCircle2 className="w-3 h-3" />}
                            {d.status === 'incompleto' && <Clock className="w-3 h-3" />}
                            {d.status === 'pendente' && <XCircle className="w-3 h-3" />}
                            {d.status === 'completo' ? 'Completo' : d.status === 'incompleto' ? 'Incompleto' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredDRS.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma DRS encontrada com os filtros selecionados
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
