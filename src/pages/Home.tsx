import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  ArrowRight, 
  MapPin, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  FileText,
  Calendar,
  BarChart3,
  HeartPulse,
  Circle,
  X,
  AlertCircle
} from 'lucide-react';
import { loadMunicipios, loadRespostas, calcularKPIs, getDataAtualizacao, getMunicipiosDuplicados } from '../utils/dataLoader';

export function Home() {
  const [stats, setStats] = useState({
    totalMunicipios: 0,
    municipiosRespondidos: 0,
    percentualRespondido: 0,
    totalDRS: 0,
    drsCompletas: 0,
    percentualDRS: 0,
    respostasCompletas: 0,
    respostasEmAndamento: 0,
    emAndamentoComMunicipio: 0,
    emAndamentoSemMunicipio: 0,
    emAndamentoSemInstituicao: 0,
    totalQuestionarios: 0,
    percentualQuestionarios: 0
  });
  const [loading, setLoading] = useState(true);
  const [dataAtualizacao, setDataAtualizacao] = useState<Date | null>(null);
  const [showAbertosModal, setShowAbertosModal] = useState(false);
  const [abertosDetalhes, setAbertosDetalhes] = useState<{
    comMunicipio: { id: string; nome: string; municipios: string[]; instituicao: string }[];
    semMunicipio: { id: string; nome: string; instituicao: string }[];
    semInstituicao: { id: string; nome: string }[];
  }>({ comMunicipio: [], semMunicipio: [], semInstituicao: [] });

  useEffect(() => {
    async function loadStats() {
      try {
        const [municipios, respostas, dataAtual] = await Promise.all([
          loadMunicipios(),
          loadRespostas(),
          getDataAtualizacao()
        ]);
        setDataAtualizacao(dataAtual);
        const kpis = calcularKPIs(municipios, respostas);
        
        // Contar duplicados para subtrair da contagem de completos
        const duplicados = getMunicipiosDuplicados(respostas);
        const totalDuplicados = duplicados.reduce((acc, d) => acc + (d.respostas.length - 1), 0);
        
        // Contar apenas respostas de Município ou DRS (ignorar outras instituições)
        const completasMunicipios = respostas.filter(r => r.complete && r.instituicao === 'Municipio').length;
        const completasDRS = respostas.filter(r => r.complete && r.instituicao === 'DRS').length;
        const completasTotal = completasMunicipios + completasDRS;
        const completasSemDuplicados = completasTotal - totalDuplicados;
        
        // Log para identificar respostas com instituição diferente de Municipio/DRS
        const respostasOutras = respostas.filter(r => r.complete && r.instituicao !== 'Municipio' && r.instituicao !== 'DRS');
        if (respostasOutras.length > 0) {
          console.warn('⚠️ Respostas completas com instituição diferente de Municipio/DRS:');
          respostasOutras.forEach(r => {
            console.warn(`  ID: ${r.recordId} | Instituição: "${r.instituicao}" | Respondente: ${r.nomeRespondente}`);
          });
        }
        
        // Em andamento: separar os que têm município/DRS preenchido dos que não têm
        const abertosComMunicipio = respostas.filter(r => 
          !r.complete && r.recordId && 
          (r.instituicao === 'Municipio' || r.instituicao === 'DRS') &&
          r.municipiosRespondidos.length > 0
        );
        const abertosSemMunicipio = respostas.filter(r => 
          !r.complete && r.recordId && 
          (r.instituicao === 'Municipio' || r.instituicao === 'DRS') &&
          r.municipiosRespondidos.length === 0
        );
        const abertosSemInstituicao = respostas.filter(r => 
          !r.complete && r.recordId && 
          r.instituicao !== 'Municipio' && r.instituicao !== 'DRS'
        );
        const emAndamento = abertosComMunicipio.length + abertosSemMunicipio.length + abertosSemInstituicao.length;
        
        // Salvar detalhes para o modal
        setAbertosDetalhes({
          comMunicipio: abertosComMunicipio.map(r => ({
            id: r.recordId,
            nome: r.nomeRespondente,
            municipios: r.municipiosRespondidos,
            instituicao: r.instituicao
          })),
          semMunicipio: abertosSemMunicipio.map(r => ({
            id: r.recordId,
            nome: r.nomeRespondente,
            instituicao: r.instituicao
          })),
          semInstituicao: abertosSemInstituicao.map(r => ({
            id: r.recordId,
            nome: r.nomeRespondente
          }))
        });
        
        const totalQ = completasSemDuplicados + emAndamento;
        
        setStats({
          ...kpis,
          respostasCompletas: completasSemDuplicados,
          respostasEmAndamento: emAndamento,
          emAndamentoComMunicipio: abertosComMunicipio.length,
          emAndamentoSemMunicipio: abertosSemMunicipio.length,
          emAndamentoSemInstituicao: abertosSemInstituicao.length,
          totalQuestionarios: totalQ,
          percentualQuestionarios: totalQ > 0 ? (completasSemDuplicados / totalQ) * 100 : 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const progressPercent = loading ? 0 : stats.percentualRespondido;

  return (
    <div className="min-h-full">
      {/* Hero Section with Gradient */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 mb-8"
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <span className="text-emerald-100 font-medium">Diagnóstico de Regulação em Saúde</span>
              {dataAtualizacao && (
                <span className="ml-3 text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-white">
                  Atualizado em {dataAtualizacao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl lg:text-4xl font-bold text-white mb-4"
            >
              Olá, bem-vindo ao Dashboard
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-100 text-lg max-w-xl mb-6"
            >
              Acompanhe em tempo real o diagnóstico da regulação em saúde no Estado de São Paulo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                to="/busca-ativa"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Acessar Painel
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>

          {/* Progress Circles - Municípios e DRS lado a lado */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="flex items-center gap-8"
          >
            {/* Círculo - Municípios */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="10"
                    fill="none"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="white"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 452" }}
                    animate={{ strokeDasharray: `${(progressPercent / 100) * 452} 452` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-3xl font-bold text-white"
                  >
                    {loading ? '...' : `${progressPercent.toFixed(0)}%`}
                  </motion.span>
                </div>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center mt-3"
              >
                <p className="text-lg font-bold text-white">{loading ? '...' : stats.municipiosRespondidos}</p>
                <p className="text-xs text-emerald-100">de {loading ? '...' : stats.totalMunicipios} municípios</p>
              </motion.div>
            </div>

            {/* Círculo - DRS */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="10"
                    fill="none"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="white"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 452" }}
                    animate={{ strokeDasharray: `${(stats.percentualDRS / 100) * 452} 452` }}
                    transition={{ duration: 1.5, delay: 0.7, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="text-3xl font-bold text-white"
                  >
                    {loading ? '...' : `${stats.percentualDRS.toFixed(0)}%`}
                  </motion.span>
                </div>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center mt-3"
              >
                <p className="text-lg font-bold text-white">{loading ? '...' : stats.drsCompletas}</p>
                <p className="text-xs text-emerald-100">de {loading ? '...' : stats.totalDRS} DRS</p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.totalMunicipios}</p>
          <p className="text-sm text-slate-500 mt-1">Municípios SP</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-teal-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-teal-600">{loading ? '...' : stats.totalDRS}</p>
              <p className="text-xs text-teal-700">DRS</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-600">19</p>
              <p className="text-xs text-slate-600">RRAS</p>
            </div>
          </div>
        </motion.div>

        {/* Municípios Respondidos */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{loading ? '...' : `${stats.percentualRespondido.toFixed(1)}%`}</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{loading ? '...' : stats.municipiosRespondidos}</p>
          <p className="text-sm text-slate-500 mt-1">Municípios Respondidos</p>
          <div className="mt-3 w-full bg-emerald-100 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${loading ? 0 : stats.percentualRespondido}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">de {loading ? '...' : stats.totalMunicipios}</p>
        </motion.div>

        {/* DRS Respondidos */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-violet-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{loading ? '...' : `${stats.percentualDRS.toFixed(1)}%`}</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-violet-600">{loading ? '...' : stats.drsCompletas}</p>
          <p className="text-sm text-slate-500 mt-1">DRS Respondidos</p>
          <div className="mt-3 w-full bg-violet-100 rounded-full h-2">
            <div 
              className="bg-violet-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${loading ? 0 : stats.percentualDRS}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">de {loading ? '...' : stats.totalDRS}</p>
        </motion.div>

        {/* Questionários - Completos e Abertos */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full">Únicos</span>
          </div>
          <p className="text-3xl font-bold text-cyan-600">{loading ? '...' : stats.totalQuestionarios}</p>
          <p className="text-sm text-slate-500 mt-1">Questionários</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{loading ? '...' : stats.respostasCompletas}</p>
              <p className="text-xs text-emerald-700">Completos</p>
            </div>
            <button 
              onClick={() => setShowAbertosModal(true)}
              className="bg-amber-50 rounded-lg p-2 text-center hover:bg-amber-100 transition-colors cursor-pointer w-full"
            >
              <p className="text-lg font-bold text-amber-600">{loading ? '...' : stats.respostasEmAndamento}</p>
              <p className="text-xs text-amber-700">Abertos</p>
            </button>
          </div>
          {stats.respostasEmAndamento > 0 && (
            <button 
              onClick={() => setShowAbertosModal(true)}
              className="mt-2 flex items-center justify-center gap-3 text-[10px] w-full hover:bg-slate-50 rounded-lg py-1 transition-colors"
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-500">{stats.emAndamentoComMunicipio} identificados</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-slate-500">{stats.emAndamentoSemMunicipio + stats.emAndamentoSemInstituicao} não identificados</span>
              </span>
            </button>
          )}
        </motion.div>

        {/* Municípios Pendentes */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-slate-400 to-slate-500 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Pendente</span>
          </div>
          <p className="text-3xl font-bold text-slate-600">{loading ? '...' : stats.totalMunicipios - stats.municipiosRespondidos}</p>
          <p className="text-sm text-slate-500 mt-1">Municípios Aguardando</p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
            <div 
              className="bg-slate-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${loading ? 0 : ((stats.totalMunicipios - stats.municipiosRespondidos) / stats.totalMunicipios) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{loading ? '...' : (100 - stats.percentualRespondido).toFixed(1)}% restante</p>
        </motion.div>
      </motion.div>

      {/* Project Planner Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Planejamento do Projeto</h2>
              <p className="text-sm text-slate-500">Acompanhe as etapas do diagnóstico</p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            Fase 1 - Coleta
          </span>
        </div>

        <div className="space-y-4">
          {/* Phase 1 */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div className="w-0.5 h-16 bg-emerald-200 mt-2"></div>
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Planejamento e Preparação</h3>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Concluído</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Definição de escopo, elaboração do questionário e validação com especialistas.</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Jan - Fev 2026</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Questionário validado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 - Current */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center animate-pulse">
                  <Circle className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="w-0.5 h-16 bg-slate-200 mt-2"></div>
              </div>
              <div className="flex-1 pb-6 bg-gradient-to-r from-emerald-50/50 to-transparent -ml-2 pl-2 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Coleta de Dados</h3>
                  <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                    Em andamento
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Aplicação do questionário nos municípios de São Paulo e busca ativa.</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">Progresso da coleta</span>
                    <span className="text-emerald-600 font-semibold">{loading ? '...' : `${stats.percentualRespondido.toFixed(1)}%`}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mar - Abr 2026</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Users className="w-3.5 h-3.5" />
                    <span>{loading ? '...' : stats.municipiosRespondidos} municípios</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-400">Análise e Relatório</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Pendente</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">Análise dos dados coletados e elaboração do relatório final.</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mai - Jun 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid md:grid-cols-2 gap-6"
      >
        <Link
          to="/busca-ativa"
          className="group bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-start gap-4">
            <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">
                Painel de Respondentes
              </h2>
              <p className="text-emerald-100 text-sm mb-4">
                Visualize o mapa interativo e identifique municípios pendentes.
              </p>
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                Acessar Painel
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        <Link to="/analise" className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer block">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Análise de Respostas
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Explore os resultados com gráficos interativos por bloco de perguntas.
              </p>
              <span className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                Acessar análise →
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Modal de Questionários em Aberto */}
      {showAbertosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Questionários em Aberto</h3>
                  <p className="text-xs text-slate-500">{stats.respostasEmAndamento} questionários não finalizados</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAbertosModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Identificados (com município) */}
              {abertosDetalhes.comMunicipio.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h4 className="font-semibold text-slate-700 text-sm">
                      Identificados ({abertosDetalhes.comMunicipio.length})
                    </h4>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 space-y-2">
                    {abertosDetalhes.comMunicipio.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">ID {item.id}</span>
                          <span className="text-xs text-slate-400">{item.instituicao}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.municipios.map((m, i) => (
                            <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem município preenchido */}
              {abertosDetalhes.semMunicipio.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <h4 className="font-semibold text-slate-700 text-sm">
                      Sem município preenchido ({abertosDetalhes.semMunicipio.length})
                    </h4>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                    {abertosDetalhes.semMunicipio.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-sm flex items-center justify-between">
                        <span className="font-medium text-slate-700">ID {item.id}</span>
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">{item.instituicao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem instituição */}
              {abertosDetalhes.semInstituicao.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <h4 className="font-semibold text-slate-700 text-sm">
                      Sem instituição definida ({abertosDetalhes.semInstituicao.length})
                    </h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    {abertosDetalhes.semInstituicao.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-sm">
                        <span className="font-medium text-slate-700">ID {item.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => setShowAbertosModal(false)}
                className="w-full bg-slate-800 text-white py-2 rounded-xl font-medium hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
