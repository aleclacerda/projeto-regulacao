import { useEffect, useState } from 'react';
import { Building2, Network, CheckCircle2, Clock, MapPin, Users, Search, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FilterPanel } from '../components/FilterPanel';
import { SPMapLeaflet } from '../components/SPMapLeaflet';
import { 
  loadMunicipios, 
  loadRespostas, 
  calcularKPIs, 
  getMunicipiosPendentes,
  getMunicipiosRespondidos,
  normalizeNome
} from '../utils/dataLoader';
import type { Municipio, Resposta } from '../types';

export function BuscaAtiva() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [selectedRRAS, setSelectedRRAS] = useState<string | null>(null);
  const [selectedDRS, setSelectedDRS] = useState<string | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [munis, resps] = await Promise.all([
          loadMunicipios(),
          loadRespostas()
        ]);
        setMunicipios(munis);
        setRespostas(resps);
      } catch (err) {
        setError('Erro ao carregar dados. Verifique se os arquivos CSV estão disponíveis.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtro = {
    rras: selectedRRAS || undefined,
    drs: selectedDRS || undefined
  };

  const kpis = calcularKPIs(municipios, respostas, filtro);
  const pendentes = getMunicipiosPendentes(municipios, respostas, filtro);
  const respondidosSet = getMunicipiosRespondidos(respostas, municipios);

  const municipiosFiltrados = municipios.filter(m => {
    if (selectedRRAS && m.rras !== selectedRRAS) return false;
    if (selectedDRS && m.drs !== selectedDRS) return false;
    if (selectedMunicipio && m.nome !== selectedMunicipio) return false;
    return true;
  });

  // Filtered pendentes for search
  const filteredPendentes = pendentes.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.drs.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rras.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPendentes.length / itemsPerPage);
  const paginatedPendentes = filteredPendentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats by DRS for insights - ALL DRS
  const drsSummary = [...new Set(municipiosFiltrados.map(m => m.drs))].map(drs => {
    const total = municipiosFiltrados.filter(m => m.drs === drs).length;
    const respondidos = municipiosFiltrados.filter(m => 
      m.drs === drs && respondidosSet.has(normalizeNome(m.nome))
    ).length;
    return { drs, total, respondidos, percent: total > 0 ? (respondidos / total) * 100 : 0 };
  }).sort((a, b) => b.percent - a.percent);

  // Stats by RRAS for insights - ALL RRAS
  const rrasSummary = [...new Set(municipiosFiltrados.map(m => m.rras))].map(rras => {
    const total = municipiosFiltrados.filter(m => m.rras === rras).length;
    const respondidos = municipiosFiltrados.filter(m => 
      m.rras === rras && respondidosSet.has(normalizeNome(m.nome))
    ).length;
    return { rras, total, respondidos, percent: total > 0 ? (respondidos / total) * 100 : 0 };
  }).sort((a, b) => b.percent - a.percent);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" />
            <span className="text-teal-100 font-medium">Visão Geral do Diagnóstico</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Municípios */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <MapPin className="w-5 h-5 text-teal-200" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {kpis.percentualRespondido.toFixed(1)}%
                </span>
              </div>
              <p className="text-3xl font-bold">{kpis.municipiosRespondidos}</p>
              <p className="text-teal-100 text-sm">de {kpis.totalMunicipios} municípios</p>
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.percentualRespondido}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </motion.div>

            {/* DRS */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-teal-200" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {kpis.percentualDRS.toFixed(1)}%
                </span>
              </div>
              <p className="text-3xl font-bold">{kpis.drsCompletas}</p>
              <p className="text-teal-100 text-sm">de {kpis.totalDRS} DRS completas</p>
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.percentualDRS}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
              </div>
            </motion.div>

            {/* RRAS */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Network className="w-5 h-5 text-teal-200" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {kpis.percentualRRAS.toFixed(1)}%
                </span>
              </div>
              <p className="text-3xl font-bold">{kpis.rrasCobertas}</p>
              <p className="text-teal-100 text-sm">de {kpis.totalRRAS} RRAS completas</p>
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.percentualRRAS}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </motion.div>

            {/* Pendentes */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-teal-200" />
                <span className="text-xs bg-amber-400/30 text-amber-100 px-2 py-0.5 rounded-full">
                  Atenção
                </span>
              </div>
              <p className="text-3xl font-bold">{pendentes.length}</p>
              <p className="text-teal-100 text-sm">municípios pendentes</p>
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pendentes.length / kpis.totalMunicipios) * 100}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <FilterPanel
        municipios={municipios}
        selectedRRAS={selectedRRAS}
        selectedDRS={selectedDRS}
        selectedMunicipio={selectedMunicipio}
        onRRASChange={setSelectedRRAS}
        onDRSChange={setSelectedDRS}
        onMunicipioChange={setSelectedMunicipio}
      />

      {/* Main Content: Map + Side Panels */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Map - Takes 2 columns on xl screens */}
        <div className="xl:col-span-2">
          <SPMapLeaflet
            respondidos={respondidosSet}
            onMunicipioClick={setSelectedMunicipio}
            filteredDRS={selectedDRS}
            filteredRRAS={selectedRRAS}
          />
        </div>

        {/* Side Panels - DRS and RRAS */}
        <div className="space-y-4">
          {/* DRS Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-1.5 rounded-lg">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Progresso por DRS</h3>
                  <p className="text-xs text-slate-500">{drsSummary.length} DRS</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
              {drsSummary.map((item, index) => (
                <motion.div 
                  key={item.drs}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * index }}
                  onClick={() => setSelectedDRS(selectedDRS === item.drs ? null : item.drs)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    selectedDRS === item.drs ? 'ring-2 ring-teal-500 bg-teal-50' :
                    item.percent === 100 ? 'bg-emerald-50 hover:bg-emerald-100' : 
                    item.percent === 0 ? 'bg-red-50 hover:bg-red-100' :
                    'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-xs truncate flex-1 ${
                      item.percent === 100 ? 'text-emerald-700' : 
                      item.percent === 0 ? 'text-red-700' :
                      'text-slate-700'
                    }`}>
                      {item.drs}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      {item.percent === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      <span className={`text-xs font-semibold ${
                        item.percent === 100 ? 'text-emerald-600' : 
                        item.percent === 0 ? 'text-red-500' :
                        'text-teal-600'
                      }`}>
                        {item.respondidos}/{item.total}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-white rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.percent === 100 ? 'bg-emerald-500' : 
                        item.percent === 0 ? 'bg-red-300' :
                        'bg-teal-400'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RRAS Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-white">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-1.5 rounded-lg">
                  <Network className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Progresso por RRAS</h3>
                  <p className="text-xs text-slate-500">{rrasSummary.length} RRAS</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
              {rrasSummary.map((item, index) => (
                <motion.div 
                  key={item.rras}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * index }}
                  onClick={() => setSelectedRRAS(selectedRRAS === item.rras ? null : item.rras)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    selectedRRAS === item.rras ? 'ring-2 ring-cyan-500 bg-cyan-50' :
                    item.percent === 100 ? 'bg-emerald-50 hover:bg-emerald-100' : 
                    item.percent === 0 ? 'bg-red-50 hover:bg-red-100' :
                    'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-xs truncate flex-1 ${
                      item.percent === 100 ? 'text-emerald-700' : 
                      item.percent === 0 ? 'text-red-700' :
                      'text-slate-700'
                    }`}>
                      {item.rras}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      {item.percent === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      <span className={`text-xs font-semibold ${
                        item.percent === 100 ? 'text-emerald-600' : 
                        item.percent === 0 ? 'text-red-500' :
                        'text-cyan-600'
                      }`}>
                        {item.respondidos}/{item.total}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-white rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.percent === 100 ? 'bg-emerald-500' : 
                        item.percent === 0 ? 'bg-red-300' :
                        'bg-cyan-400'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Pending Table */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Municípios Pendentes</h3>
                <p className="text-xs text-slate-500">
                  {filteredPendentes.length} municípios aguardando resposta
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar município, DRS ou RRAS..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2 w-full md:w-64 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Summary by RRAS */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-medium text-slate-500 mb-3">Distribuição por RRAS</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(pendentes.map(m => m.rras))].slice(0, 8).map(rras => {
              const count = pendentes.filter(m => m.rras === rras).length;
              return (
                <motion.button
                  key={rras}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRRAS(selectedRRAS === rras ? null : rras)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRRAS === rras 
                      ? 'bg-teal-500 text-white shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {rras} <span className="opacity-70">({count})</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Município
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  DRS
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  RRAS
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Região de Saúde
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPendentes.map((municipio, index) => (
                <motion.tr 
                  key={municipio.codigo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.03 * index }}
                  className="hover:bg-teal-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      <span className="text-sm font-medium text-slate-800">{municipio.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{municipio.drs}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                      {municipio.rras}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{municipio.regiaoSaude}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-sm text-slate-600">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredPendentes.length)}</span> de{' '}
              <span className="font-medium">{filteredPendentes.length}</span>
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
