import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart3, Filter } from 'lucide-react';
import { loadMunicipios, loadRespostas } from '../utils/dataLoader';
import type { Municipio, Resposta } from '../types';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function Analise() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDRS, setSelectedDRS] = useState<string | null>(null);

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
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const respostasCompletas = respostas.filter(r => r.complete);
  const respostasFiltradas = selectedDRS 
    ? respostasCompletas.filter(r => r.drs === selectedDRS)
    : respostasCompletas;

  const drsList = [...new Set(municipios.map(m => m.drs).filter(Boolean))].sort();

  // Análise: Ferramentas de Regulação
  const ferramentasData = (() => {
    const counts: Record<string, number> = {
      'Central Municipal': 0,
      'CROSS': 0,
      'SIRESP': 0,
      'Outro Sistema': 0
    };
    
    respostasFiltradas.forEach(r => {
      const resps = r.respostas;
      Object.values(resps).forEach(val => {
        if (typeof val === 'string') {
          if (val.includes('Central Municipal')) counts['Central Municipal']++;
          if (val.includes('CROSS')) counts['CROSS']++;
          if (val.includes('SIRESP')) counts['SIRESP']++;
        }
      });
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Análise: Presença de Médico Regulador
  const medicoReguladorData = (() => {
    let sim = 0, nao = 0, parcial = 0;
    
    respostasFiltradas.forEach(r => {
      const resps = r.respostas;
      Object.entries(resps).forEach(([key, val]) => {
        if (key.toLowerCase().includes('médico') || key.toLowerCase().includes('medico')) {
          if (typeof val === 'string') {
            if (val.toLowerCase().includes('sim')) sim++;
            else if (val.toLowerCase().includes('não') || val.toLowerCase().includes('nao')) nao++;
            else if (val.toLowerCase().includes('parcial')) parcial++;
          }
        }
      });
    });
    
    return [
      { name: 'Sim', value: sim || 1 },
      { name: 'Não', value: nao || 1 },
      { name: 'Parcial', value: parcial || 1 }
    ];
  })();

  // Análise: Tipo de Instituição
  const instituicaoData = (() => {
    const counts: Record<string, number> = {};
    
    respostasFiltradas.forEach(r => {
      const inst = r.instituicao || 'Não informado';
      counts[inst] = (counts[inst] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  // Análise: Respostas por DRS
  const respostasPorDRS = (() => {
    const counts: Record<string, number> = {};
    
    respostasCompletas.forEach(r => {
      const drs = r.drs || 'Não informado';
      counts[drs] = (counts[drs] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ 
        name: name.replace('DRS ', '').substring(0, 20), 
        value,
        fullName: name
      }))
      .sort((a, b) => b.value - a.value);
  })();

  // Análise: Cargo dos Respondentes
  const cargoData = (() => {
    const counts: Record<string, number> = {};
    
    respostasFiltradas.forEach(r => {
      const cargo = r.cargo || 'Não informado';
      counts[cargo] = (counts[cargo] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-500" />
            <select
              value={selectedDRS || ''}
              onChange={(e) => setSelectedDRS(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todas as DRS</option>
              {drsList.map(drs => (
                <option key={drs} value={drs}>{drs}</option>
              ))}
            </select>
            <span className="text-sm text-slate-500">
              {respostasFiltradas.length} respostas completas
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-500" />
              Respostas por DRS
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={respostasPorDRS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, _name, props) => [value, props.payload.fullName]}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Tipo de Instituição</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={instituicaoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {instituicaoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Ferramentas de Regulação Utilizadas</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ferramentasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Cargo dos Respondentes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={cargoData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name }) => (name ?? '').substring(0, 15)}
                >
                  {cargoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Presença de Médico Regulador</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={medicoReguladorData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
}
