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
  Circle
} from 'lucide-react';
import { loadMunicipios, loadRespostas, calcularKPIs, getDataAtualizacao } from '../utils/dataLoader';

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
    totalQuestionarios: 0,
    percentualQuestionarios: 0
  });
  const [loading, setLoading] = useState(true);
  const [dataAtualizacao, setDataAtualizacao] = useState<Date | null>(null);

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
        const completas = respostas.filter(r => r.complete).length;
        const emAndamento = respostas.filter(r => !r.complete && r.recordId).length;
        const totalQ = respostas.filter(r => r.recordId).length;
        
        setStats({
          ...kpis,
          respostasCompletas: completas,
          respostasEmAndamento: emAndamento,
          totalQuestionarios: totalQ,
          percentualQuestionarios: totalQ > 0 ? (completas / totalQ) * 100 : 0
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
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
        </motion.div>

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
          <p className="text-sm text-slate-500 mt-1">Respondidos</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-cyan-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{loading ? '...' : `${stats.percentualQuestionarios.toFixed(1)}%`}</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-cyan-600">{loading ? '...' : stats.totalQuestionarios}</p>
          <p className="text-sm text-slate-500 mt-1">Questionários Respondidos</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-medium">{loading ? '...' : stats.respostasCompletas} completos</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-600 font-medium">{loading ? '...' : stats.respostasEmAndamento} em andamento</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-br from-slate-400 to-slate-500 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Pendente</span>
          </div>
          <p className="text-3xl font-bold text-slate-600">{loading ? '...' : stats.totalMunicipios - stats.municipiosRespondidos}</p>
          <p className="text-sm text-slate-500 mt-1">Aguardando</p>
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

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 w-14 h-14 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-slate-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-400 mb-2">
                Análise de Respostas
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Em breve: explore os resultados com gráficos interativos.
              </p>
              <span className="inline-flex items-center gap-2 text-slate-400 font-semibold text-sm bg-slate-100 px-3 py-1 rounded-full">
                Em desenvolvimento
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
