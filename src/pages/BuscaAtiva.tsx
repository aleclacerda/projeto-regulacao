import { useEffect, useState } from 'react';
import { Building2, Network, CheckCircle2, Clock, MapPin, Users, Search, BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { FilterPanel } from '../components/FilterPanel';
import { SPMapLeaflet } from '../components/SPMapLeaflet';
import { 
  loadMunicipios, 
  loadRespostas, 
  calcularKPIs, 
  getMunicipiosPendentes,
  getMunicipiosRespondidos,
  getMunicipiosEmAndamento,
  getDRSRespondidas,
  getDRSEmAndamento,
  getMunicipiosDuplicados,
  normalizeNome,
  normalizeDRS,
  filterRespostasByPeriod
} from '../utils/dataLoader';
import type { Municipio, Resposta, MunicipioDuplicado } from '../types';

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
  const [selectedRegiaoSaude, setSelectedRegiaoSaude] = useState<string | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'respondido' | 'em_andamento' | 'pendente'>('todos');
  const [statusFilterType, setStatusFilterType] = useState<'municipio' | 'drs'>('municipio');
  const [duplicados, setDuplicados] = useState<MunicipioDuplicado[]>([]);
  const [serieHistoricaFiltro, setSerieHistoricaFiltro] = useState<'todos' | 'municipio' | 'drs'>('todos');
  const [serieHistoricaTipo, setSerieHistoricaTipo] = useState<'acumulado' | 'diario'>('acumulado');
  
  // Estados para filtro de período
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  
  // Estados de ordenação para os painéis
  const [ordenacaoDRS, setOrdenacaoDRS] = useState<'progresso' | 'az' | 'za'>('progresso');
  const [ordenacaoRRAS, setOrdenacaoRRAS] = useState<'progresso' | 'numerico' | 'numerico_desc'>('progresso');
  const [ordenacaoRegiao, setOrdenacaoRegiao] = useState<'progresso' | 'az' | 'za'>('progresso');

  useEffect(() => {
    async function loadData() {
      try {
        const [munis, resps] = await Promise.all([
          loadMunicipios(),
          loadRespostas()
        ]);
        setMunicipios(munis);
        setRespostas(resps);
        setDuplicados(getMunicipiosDuplicados(resps));
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

  // Filtrar respostas por período
  const respostasFiltradas = filterRespostasByPeriod(
    respostas,
    dataInicio ? new Date(dataInicio + 'T00:00:00') : null,
    dataFim ? new Date(dataFim + 'T23:59:59') : null
  );

  const kpis = calcularKPIs(municipios, respostasFiltradas, filtro);
  const pendentes = getMunicipiosPendentes(municipios, respostasFiltradas, filtro);
  const respondidosSet = getMunicipiosRespondidos(respostasFiltradas, municipios);
  const emAndamentoSet = getMunicipiosEmAndamento(respostasFiltradas, municipios);
  const drsRespondidasSet = getDRSRespondidas(respostasFiltradas);
  const drsEmAndamentoSet = getDRSEmAndamento(respostasFiltradas);

  const municipiosFiltrados = municipios.filter(m => {
    if (selectedRRAS && m.rras !== selectedRRAS) return false;
    if (selectedDRS && m.drs !== selectedDRS) return false;
    if (selectedRegiaoSaude && m.regiaoSaude !== selectedRegiaoSaude) return false;
    if (selectedMunicipio && m.nome !== selectedMunicipio) return false;
    return true;
  });


  // Stats by DRS for insights - ALL DRS
  const drsSummary = [...new Set(municipiosFiltrados.map(m => m.drs))].map(drs => {
    const total = municipiosFiltrados.filter(m => m.drs === drs).length;
    const respondidos = municipiosFiltrados.filter(m => 
      m.drs === drs && respondidosSet.has(normalizeNome(m.nome))
    ).length;
    const drsNormalizada = normalizeDRS(drs);
    const isDRSRespondida = drsRespondidasSet.has(drsNormalizada);
    const isDRSEmAndamento = drsEmAndamentoSet.has(drsNormalizada);
    return { 
      drs, 
      total, 
      respondidos, 
      percent: total > 0 ? (respondidos / total) * 100 : 0,
      isDRSRespondida,
      isDRSEmAndamento
    };
  }).sort((a, b) => {
    if (ordenacaoDRS === 'az') return a.drs.localeCompare(b.drs);
    if (ordenacaoDRS === 'za') return b.drs.localeCompare(a.drs);
    return b.percent - a.percent; // progresso
  });

  // Stats by RRAS for insights - ALL RRAS
  const rrasSummary = [...new Set(municipiosFiltrados.map(m => m.rras))].map(rras => {
    const total = municipiosFiltrados.filter(m => m.rras === rras).length;
    const respondidos = municipiosFiltrados.filter(m => 
      m.rras === rras && respondidosSet.has(normalizeNome(m.nome))
    ).length;
    const emAndamento = municipiosFiltrados.filter(m => 
      m.rras === rras && emAndamentoSet.has(normalizeNome(m.nome))
    ).length;
    return { 
      rras, 
      total, 
      respondidos, 
      emAndamento,
      percent: total > 0 ? (respondidos / total) * 100 : 0 
    };
  }).sort((a, b) => {
    if (ordenacaoRRAS === 'numerico') {
      const numA = parseInt(a.rras.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.rras.replace(/\D/g, '')) || 0;
      return numA - numB;
    }
    if (ordenacaoRRAS === 'numerico_desc') {
      const numA = parseInt(a.rras.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.rras.replace(/\D/g, '')) || 0;
      return numB - numA;
    }
    return b.percent - a.percent; // progresso
  });

  // Stats by Região de Saúde
  // Verde (completa) apenas quando 100% dos municípios da região respondem
  const regiaoSaudeSummary = [...new Set(municipiosFiltrados.map(m => m.regiaoSaude).filter(r => r))].map(regiao => {
    const total = municipiosFiltrados.filter(m => m.regiaoSaude === regiao).length;
    const respondidos = municipiosFiltrados.filter(m => 
      m.regiaoSaude === regiao && respondidosSet.has(normalizeNome(m.nome))
    ).length;
    const emAndamento = municipiosFiltrados.filter(m => 
      m.regiaoSaude === regiao && emAndamentoSet.has(normalizeNome(m.nome))
    ).length;
    // Região completa apenas quando TODOS os municípios responderam
    const isRegiaoCompleta = total > 0 && respondidos === total;
    // Em andamento se tem algum respondido ou em andamento, mas não todos
    const isRegiaoEmAndamento = !isRegiaoCompleta && (respondidos > 0 || emAndamento > 0);
    return { 
      regiao, 
      total, 
      respondidos, 
      emAndamento,
      percent: total > 0 ? (respondidos / total) * 100 : 0,
      isRegiaoCompleta,
      isRegiaoEmAndamento
    };
  }).sort((a, b) => {
    if (ordenacaoRegiao === 'az') return a.regiao.localeCompare(b.regiao);
    if (ordenacaoRegiao === 'za') return b.regiao.localeCompare(a.regiao);
    return b.percent - a.percent; // progresso
  });

  // Funções de download CSV
  const downloadCSV = (data: string, filename: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadDRSCSV = () => {
    const headers = ['DRS', 'Respondidos', 'Total', 'Percentual', 'Status DRS', 'Status Municípios'];
    const rows = drsSummary.map(item => [
      item.drs,
      item.respondidos,
      item.total,
      item.percent.toFixed(1) + '%',
      item.isDRSRespondida ? 'Completa' : item.isDRSEmAndamento ? 'Em Andamento' : 'Pendente',
      `${item.respondidos}/${item.total}`
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadCSV(csv, 'progresso_drs.csv');
  };

  const downloadRRASCSV = () => {
    const headers = ['RRAS', 'Respondidos', 'Em Andamento', 'Total', 'Percentual'];
    const rows = rrasSummary.map(item => [
      item.rras,
      item.respondidos,
      item.emAndamento,
      item.total,
      item.percent.toFixed(1) + '%'
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadCSV(csv, 'progresso_rras.csv');
  };

  const downloadRegiaoCSV = () => {
    const headers = ['Região de Saúde', 'Respondidos', 'Em Andamento', 'Total', 'Percentual', 'Status'];
    const rows = regiaoSaudeSummary.map(item => [
      item.regiao,
      item.respondidos,
      item.emAndamento,
      item.total,
      item.percent.toFixed(1) + '%',
      item.isRegiaoCompleta ? 'Completa' : item.isRegiaoEmAndamento ? 'Em Andamento' : 'Pendente'
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadCSV(csv, 'progresso_regiao_saude.csv');
  };

  // Série histórica por dia (respostas completas)
  const serieHistorica = (() => {
    // Municípios válidos baseados nos filtros
    const municipiosValidosSet = new Set(
      municipiosFiltrados.map(m => normalizeNome(m.nome))
    );

    // Calcular série de municípios
    const calcularSerieMunicipios = () => {
      const respostasMunicipios = respostasFiltradas.filter(r => r.complete && r.instituicao === 'Municipio');

      const respostasOrdenadas = [...respostasMunicipios].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateA - dateB;
      });

      const municipiosContados = new Set<string>();
      const porDia: Record<string, number> = {};

      for (const resposta of respostasOrdenadas) {
        if (!resposta.timestamp) continue;
        
        const dataMatch = resposta.timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!dataMatch) continue;
        const mes = dataMatch[1].padStart(2, '0');
        const diaNum = dataMatch[2].padStart(2, '0');
        const ano = dataMatch[3];
        const dia = `${ano}-${mes}-${diaNum}`;

        let novosNesteDia = 0;
        for (const municipio of resposta.municipiosRespondidos) {
          const normalizado = normalizeNome(municipio);
          if (!municipiosContados.has(normalizado) && municipiosValidosSet.has(normalizado)) {
            municipiosContados.add(normalizado);
            novosNesteDia++;
          }
        }

        if (novosNesteDia > 0) {
          porDia[dia] = (porDia[dia] || 0) + novosNesteDia;
        }
      }

      return porDia;
    };

    // Calcular série de DRS (conta DRS únicas, não municípios)
    const calcularSerieDRS = () => {
      const respostasDRS = respostasFiltradas.filter(r => r.complete && r.instituicao === 'DRS' && r.drs);

      const respostasOrdenadas = [...respostasDRS].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateA - dateB;
      });

      const drsContadas = new Set<string>();
      const porDia: Record<string, number> = {};

      for (const resposta of respostasOrdenadas) {
        if (!resposta.timestamp || !resposta.drs) continue;
        
        const dataMatch = resposta.timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!dataMatch) continue;
        const mes = dataMatch[1].padStart(2, '0');
        const diaNum = dataMatch[2].padStart(2, '0');
        const ano = dataMatch[3];
        const dia = `${ano}-${mes}-${diaNum}`;

        // Conta DRS única (não duplicada)
        if (!drsContadas.has(resposta.drs)) {
          drsContadas.add(resposta.drs);
          porDia[dia] = (porDia[dia] || 0) + 1;
        }
      }

      return porDia;
    };

    // Calcular séries separadas
    const serieMunicipios = calcularSerieMunicipios();
    const serieDRS = calcularSerieDRS();
    
    // Obter todos os dias únicos
    const todosDias = [...new Set([...Object.keys(serieMunicipios), ...Object.keys(serieDRS)])].sort();
    
    // Construir série com acumulados
    let acumMunicipios = 0;
    let acumDRS = 0;
    
    return todosDias.map(dia => {
      acumMunicipios += serieMunicipios[dia] || 0;
      acumDRS += serieDRS[dia] || 0;
      return {
        dia,
        diaFormatado: new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        municipios: acumMunicipios,
        drs: acumDRS,
        total: acumMunicipios + acumDRS,
        novosMunicipios: serieMunicipios[dia] || 0,
        novosDRS: serieDRS[dia] || 0
      };
    });
  })();

  // Função para determinar status do município
  const getStatusMunicipio = (municipio: Municipio): 'respondido' | 'em_andamento' | 'pendente' => {
    const nomeNorm = normalizeNome(municipio.nome);
    if (respondidosSet.has(nomeNorm)) return 'respondido';
    if (emAndamentoSet.has(nomeNorm)) return 'em_andamento';
    return 'pendente';
  };

  // Função para determinar status da DRS
  const getStatusDRS = (drs: string): 'respondido' | 'em_andamento' | 'pendente' => {
    const drsNormalizada = normalizeDRS(drs);
    if (drsRespondidasSet.has(drsNormalizada)) return 'respondido';
    if (drsEmAndamentoSet.has(drsNormalizada)) return 'em_andamento';
    return 'pendente';
  };

  // Todos os municípios filtrados com status (para tabela completa)
  const todosMunicipiosComStatus = municipiosFiltrados.map(m => ({
    ...m,
    status: getStatusMunicipio(m)
  })).sort((a, b) => {
    // Ordenar: pendentes primeiro, depois em andamento, depois respondidos
    const ordem: Record<'pendente' | 'em_andamento' | 'respondido', number> = { pendente: 0, em_andamento: 1, respondido: 2 };
    return ordem[a.status] - ordem[b.status] || a.nome.localeCompare(b.nome);
  });

  // Filtrar pela busca e status (por município ou por DRS)
  const municipiosFiltradosBusca = todosMunicipiosComStatus.filter(m => {
    const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.drs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rras.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (selectedStatus !== 'todos') {
      if (statusFilterType === 'municipio') {
        matchStatus = m.status === selectedStatus;
      } else {
        // Filtrar por status da DRS
        const drsStatus = getStatusDRS(m.drs);
        matchStatus = drsStatus === selectedStatus;
      }
    }
    return matchSearch && matchStatus;
  });

  // Contadores para os filtros
  const countByMunicipio = {
    total: todosMunicipiosComStatus.length,
    respondido: todosMunicipiosComStatus.filter(m => m.status === 'respondido').length,
    em_andamento: todosMunicipiosComStatus.filter(m => m.status === 'em_andamento').length,
    pendente: todosMunicipiosComStatus.filter(m => m.status === 'pendente').length
  };

  // Contar DRS únicos por status
  const allDRSList = [...new Set(todosMunicipiosComStatus.map(m => m.drs))];
  const countByDRS = {
    total: allDRSList.length,
    respondido: allDRSList.filter(drs => getStatusDRS(drs) === 'respondido').length,
    em_andamento: allDRSList.filter(drs => getStatusDRS(drs) === 'em_andamento').length,
    pendente: allDRSList.filter(drs => getStatusDRS(drs) === 'pendente').length
  };

  const currentCounts = statusFilterType === 'municipio' ? countByMunicipio : countByDRS;

  // Lista de DRS com suas RRAS para visualização compacta
  const drsComRRAS = (() => {
    const drsMap = new Map<string, { drs: string; rras: Set<string>; status: 'respondido' | 'em_andamento' | 'pendente' }>();
    
    municipiosFiltrados.forEach(m => {
      if (!drsMap.has(m.drs)) {
        drsMap.set(m.drs, {
          drs: m.drs,
          rras: new Set(),
          status: getStatusDRS(m.drs)
        });
      }
      drsMap.get(m.drs)!.rras.add(m.rras);
    });

    return Array.from(drsMap.values())
      .map(item => ({
        drs: item.drs,
        rras: Array.from(item.rras).sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.replace(/\D/g, '')) || 0;
          return numA - numB;
        }),
        status: item.status
      }))
      .sort((a, b) => {
        // Ordenar: pendentes primeiro, depois em andamento, depois respondidos
        const ordem: Record<'pendente' | 'em_andamento' | 'respondido', number> = { pendente: 0, em_andamento: 1, respondido: 2 };
        return ordem[a.status] - ordem[b.status] || a.drs.localeCompare(b.drs);
      });
  })();

  // Filtrar DRS pela busca e status
  const drsFiltrados = drsComRRAS.filter(item => {
    const matchSearch = item.drs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rras.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchStatus = selectedStatus === 'todos' || item.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPagesMunicipios = Math.ceil(municipiosFiltradosBusca.length / itemsPerPage);
  const paginatedMunicipios = municipiosFiltradosBusca.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

            {/* Regiões de Saúde */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <MapPin className="w-5 h-5 text-teal-200" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {kpis.percentualRegioesSaude.toFixed(1)}%
                </span>
              </div>
              <p className="text-3xl font-bold">{kpis.regioesSaudeRespondidas}</p>
              <p className="text-teal-100 text-sm">de {kpis.totalRegioesSaude} Regiões completas</p>
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.percentualRegioesSaude}%` }}
                  transition={{ duration: 1, delay: 0.55 }}
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
        selectedRegiaoSaude={selectedRegiaoSaude}
        selectedMunicipio={selectedMunicipio}
        onRRASChange={setSelectedRRAS}
        onDRSChange={setSelectedDRS}
        onRegiaoSaudeChange={setSelectedRegiaoSaude}
        onMunicipioChange={setSelectedMunicipio}
      />

      {/* Filtro de Período */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <span className="font-medium text-slate-700">Período das Respostas:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            {(dataInicio || dataFim) && (
              <button
                onClick={() => {
                  setDataInicio('');
                  setDataFim('');
                }}
                className="px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
              >
                Limpar período
              </button>
            )}
          </div>
          {(dataInicio || dataFim) && (
            <div className="ml-auto text-sm text-slate-500">
              {respostasFiltradas.filter(r => r.complete).length} respostas no período
            </div>
          )}
        </div>
      </motion.div>

      {/* Série Histórica */}
      {serieHistorica.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Série Histórica de Respostas</h3>
                <p className="text-xs text-slate-500">Evolução diária de municípios e DRS respondidos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Filtro Acumulado/Diário */}
              <div className="flex gap-1 bg-indigo-50 p-1 rounded-lg">
                <button
                  onClick={() => setSerieHistoricaTipo('acumulado')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    serieHistoricaTipo === 'acumulado' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  Acumulado
                </button>
                <button
                  onClick={() => setSerieHistoricaTipo('diario')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    serieHistoricaTipo === 'diario' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  Diário
                </button>
              </div>
              {/* Filtro Instituição */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setSerieHistoricaFiltro('todos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    serieHistoricaFiltro === 'todos' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSerieHistoricaFiltro('municipio')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    serieHistoricaFiltro === 'municipio' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Municípios
                </button>
                <button
                  onClick={() => setSerieHistoricaFiltro('drs')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    serieHistoricaFiltro === 'drs' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  DRS
                </button>
              </div>
            </div>
          </div>

          {/* Legenda */}
          {serieHistoricaFiltro === 'todos' && (
            <div className="flex items-center gap-4 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">Municípios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span className="text-slate-600">DRS</span>
              </div>
            </div>
          )}

          {/* Gráfico de linhas */}
          <div className="relative h-52 mt-2 px-4">
            {/* Grid horizontal */}
            <div className="absolute inset-x-4 inset-y-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="border-t border-slate-100 w-full"></div>
              ))}
            </div>

            {/* SVG para as linhas */}
            <svg 
              className="absolute inset-x-4 inset-y-0 overflow-visible"
              style={{ width: 'calc(100% - 32px)', height: '100%' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {(() => {
                const getValorMunicipio = (item: typeof serieHistorica[0]) => 
                  serieHistoricaTipo === 'acumulado' ? item.municipios : item.novosMunicipios;
                const getValorDRS = (item: typeof serieHistorica[0]) => 
                  serieHistoricaTipo === 'acumulado' ? item.drs : item.novosDRS;

                const maxValue = Math.max(
                  ...serieHistorica.map(s => 
                    serieHistoricaFiltro === 'drs' ? getValorDRS(s) : 
                    serieHistoricaFiltro === 'municipio' ? getValorMunicipio(s) : 
                    Math.max(getValorMunicipio(s), getValorDRS(s))
                  ),
                  1
                );

                const getX = (idx: number) => (idx / (serieHistorica.length - 1 || 1)) * 100;
                const getY = (value: number) => 100 - (value / maxValue) * 85 - 5;

                const pathMunicipios = serieHistorica.map((item, idx) => 
                  `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(getValorMunicipio(item))}`
                ).join(' ');

                const pathDRS = serieHistorica.map((item, idx) => 
                  `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(getValorDRS(item))}`
                ).join(' ');

                return (
                  <>
                    {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'municipio') && (
                      <path
                        d={pathMunicipios}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'drs') && (
                      <path
                        d={pathDRS}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </>
                );
              })()}
            </svg>

            {/* Rótulos nos pontos (apenas números, sem bolinhas) */}
            <div className="absolute inset-x-4 inset-y-0 flex">
              {serieHistorica.map((item, idx) => {
                const getValorMunicipio = (s: typeof serieHistorica[0]) => 
                  serieHistoricaTipo === 'acumulado' ? s.municipios : s.novosMunicipios;
                const getValorDRS = (s: typeof serieHistorica[0]) => 
                  serieHistoricaTipo === 'acumulado' ? s.drs : s.novosDRS;

                const maxValue = Math.max(
                  ...serieHistorica.map(s => 
                    serieHistoricaFiltro === 'drs' ? getValorDRS(s) : 
                    serieHistoricaFiltro === 'municipio' ? getValorMunicipio(s) : 
                    Math.max(getValorMunicipio(s), getValorDRS(s))
                  ),
                  1
                );
                
                const valorMunicipio = getValorMunicipio(item);
                const valorDRS = getValorDRS(item);
                const posYMunicipio = 100 - (valorMunicipio / maxValue) * 85 - 5;
                const posYDRS = 100 - (valorDRS / maxValue) * 85 - 5;
                
                return (
                  <div key={idx} className="flex-1 relative">
                    {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'municipio') && (
                      <span 
                        className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-600 bg-white/80 px-1 rounded"
                        style={{ top: `calc(${posYMunicipio}% - 16px)` }}
                      >
                        {valorMunicipio}
                      </span>
                    )}
                    {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'drs') && valorDRS > 0 && (
                      <span 
                        className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold text-violet-600 bg-white/80 px-1 rounded"
                        style={{ top: `calc(${posYDRS}% - 16px)` }}
                      >
                        {valorDRS}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Labels do eixo X */}
          <div className="flex mt-2 px-5">
            {serieHistorica.map((item, idx) => (
              <div key={idx} className="flex-1 text-center">
                <span className="text-[10px] text-slate-500 font-medium">{item.diaFormatado}</span>
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-700">{serieHistorica.length}</p>
                <p className="text-[10px] text-slate-500">Dias</p>
              </div>
              {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'municipio') && (
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-600">
                    {serieHistorica.length > 0 ? serieHistorica[serieHistorica.length - 1].municipios : 0}
                  </p>
                  <p className="text-[10px] text-slate-500">Municípios</p>
                </div>
              )}
              {(serieHistoricaFiltro === 'todos' || serieHistoricaFiltro === 'drs') && (
                <div className="text-center">
                  <p className="text-xl font-bold text-violet-600">
                    {serieHistorica.length > 0 ? serieHistorica[serieHistorica.length - 1].drs : 0}
                  </p>
                  <p className="text-[10px] text-slate-500">DRS</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-xl font-bold text-slate-500">
                  {serieHistorica.length > 0 
                    ? (serieHistorica[serieHistorica.length - 1].total / serieHistorica.length).toFixed(1)
                    : 0
                  }
                </p>
                <p className="text-[10px] text-slate-500">Média/dia</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Período</p>
              <p className="text-sm font-medium text-slate-600">
                {serieHistorica.length > 0 && (
                  <>
                    {serieHistorica[0].diaFormatado} - {serieHistorica[serieHistorica.length - 1].diaFormatado}
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Panels DRS, RRAS and Região de Saúde */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* DRS Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-1.5 rounded-lg">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Progresso por DRS</h3>
                  <p className="text-xs text-slate-500">{drsSummary.length} DRS • {kpis.drsCompletas} completas</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={ordenacaoDRS}
                  onChange={(e) => setOrdenacaoDRS(e.target.value as 'progresso' | 'az' | 'za')}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 cursor-pointer hover:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  <option value="progresso">% Progresso</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
                <button
                  onClick={downloadDRSCSV}
                  className="p-1.5 rounded-lg hover:bg-teal-100 text-teal-600 transition-colors"
                  title="Baixar CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
            {drsSummary.map((item, index) => (
              <motion.div 
                key={item.drs}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * index }}
                onClick={() => setSelectedDRS(selectedDRS === item.drs ? null : item.drs)}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  selectedDRS === item.drs ? 'ring-2 ring-teal-500 bg-teal-50' :
                  item.isDRSRespondida ? 'bg-emerald-50 hover:bg-emerald-100' : 
                  item.isDRSEmAndamento ? 'bg-amber-50 hover:bg-amber-100' :
                  item.percent === 0 ? 'bg-red-50 hover:bg-red-100' :
                  'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Semáforo DRS */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      item.isDRSRespondida ? 'bg-emerald-500' : 
                      item.isDRSEmAndamento ? 'bg-amber-400' :
                      'bg-red-400'
                    }`} />
                    <span className={`font-medium text-xs truncate ${
                      item.isDRSRespondida ? 'text-emerald-700' : 
                      item.isDRSEmAndamento ? 'text-amber-700' :
                      'text-slate-700'
                    }`}>
                      {item.drs}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.isDRSRespondida && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <span className={`text-xs font-semibold ${
                      item.isDRSRespondida ? 'text-emerald-600' : 
                      item.isDRSEmAndamento ? 'text-amber-600' :
                      'text-teal-600'
                    }`}>
                      {item.respondidos}/{item.total}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-white rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      item.isDRSRespondida ? 'bg-emerald-500' : 
                      item.isDRSEmAndamento ? 'bg-amber-400' :
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-1.5 rounded-lg">
                  <Network className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Progresso por RRAS</h3>
                  <p className="text-xs text-slate-500">{rrasSummary.length} RRAS • {kpis.rrasCobertas} completas</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={ordenacaoRRAS}
                  onChange={(e) => setOrdenacaoRRAS(e.target.value as 'progresso' | 'numerico' | 'numerico_desc')}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="progresso">% Progresso</option>
                  <option value="numerico">RRAS 1 → 19</option>
                  <option value="numerico_desc">RRAS 19 → 1</option>
                </select>
                <button
                  onClick={downloadRRASCSV}
                  className="p-1.5 rounded-lg hover:bg-cyan-100 text-cyan-600 transition-colors"
                  title="Baixar CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
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
                  item.emAndamento > 0 ? 'bg-amber-50 hover:bg-amber-100' :
                  item.percent === 0 ? 'bg-red-50 hover:bg-red-100' :
                  'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Semáforo RRAS */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      item.percent === 100 ? 'bg-emerald-500' : 
                      item.respondidos > 0 || item.emAndamento > 0 ? 'bg-amber-400' :
                      'bg-red-400'
                    }`} />
                    <span className={`font-medium text-xs truncate ${
                      item.percent === 100 ? 'text-emerald-700' : 
                      item.respondidos > 0 || item.emAndamento > 0 ? 'text-amber-700' :
                      'text-slate-700'
                    }`}>
                      {item.rras}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.percent === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <span className={`text-xs font-semibold ${
                      item.percent === 100 ? 'text-emerald-600' : 
                      item.respondidos > 0 ? 'text-amber-600' :
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
                      item.respondidos > 0 ? 'bg-amber-400' :
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

        {/* Região de Saúde Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 rounded-lg">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Progresso por Região de Saúde</h3>
                  <p className="text-xs text-slate-500">{regiaoSaudeSummary.length} regiões • {kpis.regioesSaudeRespondidas} respondidas</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={ordenacaoRegiao}
                  onChange={(e) => setOrdenacaoRegiao(e.target.value as 'progresso' | 'az' | 'za')}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 cursor-pointer hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value="progresso">% Progresso</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
                <button
                  onClick={downloadRegiaoCSV}
                  className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-600 transition-colors"
                  title="Baixar CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
            {regiaoSaudeSummary.map((item, index) => (
              <motion.div 
                key={item.regiao}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * index }}
                className={`p-2 rounded-lg transition-all ${
                  item.isRegiaoCompleta ? 'bg-emerald-50 hover:bg-emerald-100' : 
                  item.isRegiaoEmAndamento ? 'bg-amber-50 hover:bg-amber-100' :
                  item.percent === 0 ? 'bg-red-50 hover:bg-red-100' :
                  'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Semáforo Região de Saúde */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      item.isRegiaoCompleta ? 'bg-emerald-500' : 
                      item.isRegiaoEmAndamento ? 'bg-amber-400' :
                      'bg-red-400'
                    }`} />
                    <span className={`font-medium text-xs truncate ${
                      item.isRegiaoCompleta ? 'text-emerald-700' : 
                      item.isRegiaoEmAndamento ? 'text-amber-700' :
                      'text-slate-700'
                    }`}>
                      {item.regiao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {item.isRegiaoCompleta && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <span className={`text-xs font-semibold ${
                      item.isRegiaoCompleta ? 'text-emerald-600' : 
                      item.isRegiaoEmAndamento ? 'text-amber-600' :
                      'text-purple-600'
                    }`}>
                      {item.respondidos}/{item.total}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-white rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      item.isRegiaoCompleta ? 'bg-emerald-500' : 
                      item.isRegiaoEmAndamento ? 'bg-amber-400' :
                      item.percent === 0 ? 'bg-red-300' :
                      'bg-purple-400'
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Map - Full width below tables */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SPMapLeaflet
          respondidos={respondidosSet}
          onMunicipioClick={setSelectedMunicipio}
          filteredDRS={selectedDRS}
          filteredRRAS={selectedRRAS}
        />
      </motion.div>

      {/* Duplicados - Análise Gerencial (sintético, ao final) */}

      {/* Enhanced Municipalities Table with Traffic Lights */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {statusFilterType === 'municipio' ? 'Status dos Municípios' : 'Status dos DRS'}
                </h3>
                <p className="text-xs text-slate-500">
                  {statusFilterType === 'municipio' ? (
                    <>
                      {municipiosFiltradosBusca.length} municípios • 
                      <span className="text-emerald-600 ml-1">{countByMunicipio.respondido} respondidos</span> • 
                      <span className="text-amber-600 ml-1">{countByMunicipio.em_andamento} em andamento</span> • 
                      <span className="text-red-600 ml-1">{countByMunicipio.pendente} pendentes</span>
                    </>
                  ) : (
                    <>
                      {countByDRS.total} DRS • 
                      <span className="text-emerald-600 ml-1">{countByDRS.respondido} respondidos</span> • 
                      <span className="text-amber-600 ml-1">{countByDRS.em_andamento} em andamento</span> • 
                      <span className="text-red-600 ml-1">{countByDRS.pendente} pendentes</span>
                    </>
                  )}
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

        {/* Filter by Status */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Tipo de filtro */}
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-slate-500">Filtrar por:</p>
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => { setStatusFilterType('municipio'); setSelectedStatus('todos'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    statusFilterType === 'municipio' 
                      ? 'bg-teal-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Município
                </button>
                <button
                  onClick={() => { setStatusFilterType('drs'); setSelectedStatus('todos'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    statusFilterType === 'drs' 
                      ? 'bg-teal-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  DRS
                </button>
              </div>
            </div>

            {/* Status buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setSelectedStatus('todos'); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === 'todos' 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  selectedStatus === 'todos' ? 'bg-slate-600' : 'bg-slate-100'
                }`}>
                  {currentCounts.total}
                </span>
              </button>
              <button
                onClick={() => { setSelectedStatus('respondido'); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === 'respondido' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Respondidos
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  selectedStatus === 'respondido' ? 'bg-emerald-500' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {currentCounts.respondido}
                </span>
              </button>
              <button
                onClick={() => { setSelectedStatus('em_andamento'); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === 'em_andamento' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                Em andamento
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  selectedStatus === 'em_andamento' ? 'bg-amber-400' : 'bg-amber-100 text-amber-700'
                }`}>
                  {currentCounts.em_andamento}
                </span>
              </button>
              <button
                onClick={() => { setSelectedStatus('pendente'); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === 'pendente' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                Pendentes
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  selectedStatus === 'pendente' ? 'bg-red-400' : 'bg-red-100 text-red-700'
                }`}>
                  {currentCounts.pendente}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {statusFilterType === 'municipio' ? (
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
                {paginatedMunicipios.map((municipio, index) => {
                  const drsStatus = getStatusDRS(municipio.drs);
                  return (
                    <motion.tr 
                      key={municipio.codigo}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * index }}
                      className={`transition-colors ${
                        municipio.status === 'respondido' ? 'bg-emerald-50/30 hover:bg-emerald-50' :
                        municipio.status === 'em_andamento' ? 'bg-amber-50/30 hover:bg-amber-50' :
                        'hover:bg-red-50/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Semáforo do Município */}
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            municipio.status === 'respondido' ? 'bg-emerald-500' :
                            municipio.status === 'em_andamento' ? 'bg-amber-400' :
                            'bg-red-400'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            municipio.status === 'respondido' ? 'text-emerald-700' :
                            municipio.status === 'em_andamento' ? 'text-amber-700' :
                            'text-slate-800'
                          }`}>{municipio.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Semáforo da DRS */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            drsStatus === 'respondido' ? 'bg-emerald-500' :
                            drsStatus === 'em_andamento' ? 'bg-amber-400' :
                            'bg-red-400'
                          }`}></div>
                          <span className="text-sm text-slate-600">{municipio.drs}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {municipio.rras}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{municipio.regiaoSaude}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Visualização compacta por DRS */
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    DRS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    RRAS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drsFiltrados.map((item, index) => (
                  <motion.tr 
                    key={item.drs}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03 * index }}
                    className={`transition-colors ${
                      item.status === 'respondido' ? 'bg-emerald-50/30 hover:bg-emerald-50' :
                      item.status === 'em_andamento' ? 'bg-amber-50/30 hover:bg-amber-50' :
                      'hover:bg-red-50/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'respondido' ? 'bg-emerald-500' :
                        item.status === 'em_andamento' ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}></div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        item.status === 'respondido' ? 'text-emerald-700' :
                        item.status === 'em_andamento' ? 'text-amber-700' :
                        'text-slate-800'
                      }`}>{item.drs}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {item.rras.map(rras => (
                          <span key={rras} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                            {rras}
                          </span>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPagesMunicipios > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-sm text-slate-600">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, municipiosFiltradosBusca.length)}</span> de{' '}
              <span className="font-medium">{municipiosFiltradosBusca.length}</span>
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPagesMunicipios, 5) }, (_, i) => {
                let pageNum;
                if (totalPagesMunicipios <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPagesMunicipios - 2) {
                  pageNum = totalPagesMunicipios - 4 + i;
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

      {/* Análise Gerencial: Duplicados (sintético, ao final) */}
      {duplicados.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <h4 className="font-semibold text-amber-800 text-sm">Análise Gerencial: Respostas Duplicadas</h4>
          </div>
          <p className="text-xs text-amber-700 mb-2">
            {duplicados.length} município(s) com múltiplas respostas. A contagem considera apenas a resposta mais recente.
          </p>
          <div className="flex flex-wrap gap-2">
            {duplicados.map((dup, idx) => (
              <span key={idx} className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-xs font-medium">
                <span className="capitalize">{dup.municipio}</span>
                <span className="text-amber-600 ml-1">
                  (IDs: {dup.respostas.map(r => r.recordId).join(', ')})
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
