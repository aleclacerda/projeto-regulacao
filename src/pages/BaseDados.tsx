import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';

interface Resposta {
  [key: string]: string;
}

export default function BaseDados() {
  const [dados, setDados] = useState<Resposta[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  useEffect(() => {
    fetch('/data/respostas.csv')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const decoder = new TextDecoder('windows-1252');
        const text = decoder.decode(buffer);
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const todasColunas = Object.keys(results.data[0] as object);
            // Remover as primeiras 9 colunas (sigilosas)
            const colunasVisiveis = todasColunas.slice(9);
            setColunas(colunasVisiveis);
            
            // Filtrar apenas respostas completas
            const dadosCompletos = (results.data as Resposta[]).filter(
              row => row['Complete?'] === 'Complete'
            );
            setDados(dadosCompletos);
            setLoading(false);
          }
        });
      });
  }, []);

  // Identificar municípios duplicados (mais de uma resposta)
  const municipiosDuplicados = useMemo(() => {
    const contagem: Record<string, number> = {};
    dados.forEach(row => {
      const mun = row['Município'];
      if (mun && mun.trim()) {
        contagem[mun] = (contagem[mun] || 0) + 1;
      }
    });
    return new Set(Object.entries(contagem).filter(([_, count]) => count > 1).map(([mun]) => mun));
  }, [dados]);

  const totalDuplicados = municipiosDuplicados.size;

  // Filtrar dados pela busca
  const dadosFiltrados = useMemo(() => {
    return dados.filter(row => {
      return busca === '' || 
        Object.values(row).some(val => 
          val?.toLowerCase().includes(busca.toLowerCase())
        );
    });
  }, [dados, busca]);

  // Paginação
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina);
  const dadosPaginados = dadosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Reset página quando busca muda
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca]);

  // Download CSV filtrado
  const downloadCSV = () => {
    const colunasExport = colunas;
    const dadosExport = dadosFiltrados.map(row => {
      const novaRow: Record<string, string> = {};
      colunasExport.forEach(col => {
        novaRow[col] = row[col] || '';
      });
      return novaRow;
    });
    
    const csv = Papa.unparse(dadosExport);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'base_dados_filtrada.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabela Principal */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-0"
      >
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800">Base de Dados</h1>
              <p className="text-xs text-slate-500">Visualização das respostas (sem dados sigilosos)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar em todos os campos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {/* Exportar */}
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <table className="text-sm table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">Instituição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">Município</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">DRS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">RRAS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">Região de Saúde</th>
                {colunas.slice(6).map((col, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 whitespace-nowrap" title={col}>
                    {col.length > 30 ? col.substring(0, 30) + '...' : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dadosPaginados.map((row, idx) => {
                const isDuplicado = municipiosDuplicados.has(row['Município']);
                return (
                  <tr key={idx} className={`hover:bg-teal-50/50 transition-colors ${isDuplicado ? 'bg-amber-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        {(paginaAtual - 1) * itensPorPagina + idx + 1}
                        {isDuplicado && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        row['Instituição do respondente'] === 'DRS' 
                          ? 'bg-violet-100 text-violet-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row['Instituição do respondente']}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${isDuplicado ? 'text-amber-700' : 'text-slate-700'}`}>
                          {row['Município'] || '-'}
                        </span>
                        {isDuplicado && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                            DUPLICADO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row['DRS']}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {row['RRAS']}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row['Região de Saúde']}</td>
                    {colunas.slice(6).map((col, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-slate-600 max-w-xs truncate" title={row[col]}>
                        {row[col] || <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé com paginação e info de duplicados */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                Mostrando <span className="font-medium text-slate-700">{(paginaAtual - 1) * itensPorPagina + 1}</span> a{' '}
                <span className="font-medium text-slate-700">{Math.min(paginaAtual * itensPorPagina, dadosFiltrados.length)}</span> de{' '}
                <span className="font-medium text-slate-700">{dadosFiltrados.length}</span> registros
              </span>
              {totalDuplicados > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  {totalDuplicados} municípios com respostas duplicadas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaginaAtual(1)}
                disabled={paginaAtual === 1}
                className="px-2 py-1 text-xs rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Primeira
              </button>
              <button
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(7, totalPaginas) }, (_, i) => {
                let pageNum;
                if (totalPaginas <= 7) {
                  pageNum = i + 1;
                } else if (paginaAtual <= 4) {
                  pageNum = i + 1;
                } else if (paginaAtual >= totalPaginas - 3) {
                  pageNum = totalPaginas - 6 + i;
                } else {
                  pageNum = paginaAtual - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPaginaAtual(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      paginaAtual === pageNum
                        ? 'bg-teal-600 text-white'
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPaginaAtual(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
                className="px-2 py-1 text-xs rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Última
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
