import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadPopulacaoMunicipios, getPorteLabel, getPorteDescricao, loadMunicipiosCompletos, calcularEstatisticasPorRegiao } from '../utils/dataLoader';
import type { MunicipioPopulacao, PortePopulacional, MunicipioCompleto, EstatisticasRegiao } from '../utils/dataLoader';
import { Users, MapPin, ChevronDown, ChevronUp, Table2, Download, ArrowUpDown } from 'lucide-react';

type MapViewMode = 'respondentes' | 'porte';
type PorteFilterMode = 'todos' | 'respondidos' | 'pendentes';
type TipoRegiao = 'rras' | 'drs' | 'regiaoSaude';
type OrdenacaoTipo = 'nome' | 'total' | 'respondidos' | 'pct';
type OrdenacaoDirecao = 'asc' | 'desc';

interface SPMapLeafletProps {
  respondidos: Set<string>;
  onMunicipioClick?: (nome: string) => void;
  filteredDRS?: string | null;
  filteredRRAS?: string | null;
}

// Cores para cada porte populacional
const PORTE_COLORS: Record<PortePopulacional, string> = {
  pequeno_i: '#93c5fd',   // Azul claro
  pequeno_ii: '#60a5fa',  // Azul médio
  medio: '#f59e0b',       // Laranja
  grande: '#ef4444',      // Vermelho
};

function normalizeNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function MapController({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Só ajusta bounds uma vez na carga inicial
    if (!initialized) {
      map.fitBounds(bounds);
      setInitialized(true);
    }
  }, [map, bounds, initialized]);
  
  return null;
}

export function SPMapLeaflet({ respondidos, onMunicipioClick, filteredDRS, filteredRRAS }: SPMapLeafletProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMunicipio, setHoveredMunicipio] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>('respondentes');
  const [porteFilter, setPorteFilter] = useState<PorteFilterMode>('todos');
  const [populacaoData, setPopulacaoData] = useState<Map<string, MunicipioPopulacao>>(new Map());
  const [geoKey, setGeoKey] = useState(0); // Para forçar re-render do GeoJSON
  
  // Estados para tabela de estatísticas
  const [showTable, setShowTable] = useState(false);
  const [tipoRegiao, setTipoRegiao] = useState<TipoRegiao>('rras');
  const [municipiosCompletos, setMunicipiosCompletos] = useState<MunicipioCompleto[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasRegiao[]>([]);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('nome');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('asc');

  useEffect(() => {
    Promise.all([
      fetch('/data/sp_municipios.json').then(res => res.json()),
      loadPopulacaoMunicipios(),
      loadMunicipiosCompletos()
    ])
      .then(([geoJson, populacao, municipiosData]) => {
        setGeoData(geoJson);
        setPopulacaoData(populacao);
        setMunicipiosCompletos(municipiosData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar dados:', err);
        setLoading(false);
      });
  }, []);
  
  // Recalcula estatísticas quando muda o tipo de região ou respondidos
  useEffect(() => {
    if (municipiosCompletos.length > 0) {
      const stats = calcularEstatisticasPorRegiao(municipiosCompletos, respondidos, tipoRegiao);
      setEstatisticas(stats);
    }
  }, [municipiosCompletos, respondidos, tipoRegiao]);

  // Função para comparação natural de strings (RRAS1, RRAS2, ..., RRAS10)
  const naturalCompare = (a: string, b: string): number => {
    const regex = /(\d+)|(\D+)/g;
    const partsA = a.match(regex) || [];
    const partsB = b.match(regex) || [];
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || '';
      const partB = partsB[i] || '';
      
      const numA = parseInt(partA, 10);
      const numB = parseInt(partB, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      } else {
        const cmp = partA.localeCompare(partB);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  };

  // Função para ordenar estatísticas
  const estatisticasOrdenadas = [...estatisticas].sort((a, b) => {
    let valorA: number | string;
    let valorB: number | string;
    
    switch (ordenacao) {
      case 'nome':
        valorA = a.nome;
        valorB = b.nome;
        break;
      case 'total':
        valorA = a.total.total;
        valorB = b.total.total;
        break;
      case 'respondidos':
        valorA = a.respondidos.total;
        valorB = b.respondidos.total;
        break;
      case 'pct':
        valorA = a.total.total > 0 ? (a.respondidos.total / a.total.total) : 0;
        valorB = b.total.total > 0 ? (b.respondidos.total / b.total.total) : 0;
        break;
      default:
        valorA = a.nome;
        valorB = b.nome;
    }
    
    if (typeof valorA === 'string' && typeof valorB === 'string') {
      const cmp = naturalCompare(valorA, valorB);
      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
    }
    
    return ordenacaoDirecao === 'asc' 
      ? (valorA as number) - (valorB as number) 
      : (valorB as number) - (valorA as number);
  });

  // Função para exportar CSV
  const exportarCSV = () => {
    const tipoLabel = tipoRegiao === 'rras' ? 'RRAS' : tipoRegiao === 'drs' ? 'DRS' : 'Região de Saúde';
    
    const headers = [
      tipoLabel,
      'Pequeno I - Total', 'Pequeno I - Respondidos', 'Pequeno I - %',
      'Pequeno II - Total', 'Pequeno II - Respondidos', 'Pequeno II - %',
      'Médio - Total', 'Médio - Respondidos', 'Médio - %',
      'Grande - Total', 'Grande - Respondidos', 'Grande - %',
      'Total Geral', 'Total Respondidos', 'Total %'
    ];
    
    const rows = estatisticasOrdenadas.map(stat => {
      const calcPct = (total: number, resp: number) => total > 0 ? Math.round((resp / total) * 100) : 0;
      
      return [
        stat.nome,
        stat.total.pequeno_i, stat.respondidos.pequeno_i, calcPct(stat.total.pequeno_i, stat.respondidos.pequeno_i) + '%',
        stat.total.pequeno_ii, stat.respondidos.pequeno_ii, calcPct(stat.total.pequeno_ii, stat.respondidos.pequeno_ii) + '%',
        stat.total.medio, stat.respondidos.medio, calcPct(stat.total.medio, stat.respondidos.medio) + '%',
        stat.total.grande, stat.respondidos.grande, calcPct(stat.total.grande, stat.respondidos.grande) + '%',
        stat.total.total, stat.respondidos.total, calcPct(stat.total.total, stat.respondidos.total) + '%'
      ];
    });
    
    // Adicionar linha de totais
    const totals = estatisticasOrdenadas.reduce((acc, stat) => ({
      p1_total: acc.p1_total + stat.total.pequeno_i,
      p1_resp: acc.p1_resp + stat.respondidos.pequeno_i,
      p2_total: acc.p2_total + stat.total.pequeno_ii,
      p2_resp: acc.p2_resp + stat.respondidos.pequeno_ii,
      m_total: acc.m_total + stat.total.medio,
      m_resp: acc.m_resp + stat.respondidos.medio,
      g_total: acc.g_total + stat.total.grande,
      g_resp: acc.g_resp + stat.respondidos.grande,
      total: acc.total + stat.total.total,
      resp: acc.resp + stat.respondidos.total,
    }), { p1_total: 0, p1_resp: 0, p2_total: 0, p2_resp: 0, m_total: 0, m_resp: 0, g_total: 0, g_resp: 0, total: 0, resp: 0 });
    
    const calcPct = (total: number, resp: number) => total > 0 ? Math.round((resp / total) * 100) : 0;
    
    rows.push([
      'TOTAL',
      totals.p1_total, totals.p1_resp, calcPct(totals.p1_total, totals.p1_resp) + '%',
      totals.p2_total, totals.p2_resp, calcPct(totals.p2_total, totals.p2_resp) + '%',
      totals.m_total, totals.m_resp, calcPct(totals.m_total, totals.m_resp) + '%',
      totals.g_total, totals.g_resp, calcPct(totals.g_total, totals.g_resp) + '%',
      totals.total, totals.resp, calcPct(totals.total, totals.resp) + '%'
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estatisticas_porte_${tipoRegiao}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Atualiza o GeoJSON quando o modo de visualização ou filtro muda
  useEffect(() => {
    setGeoKey(prev => prev + 1);
  }, [viewMode, porteFilter]);

  // Check if municipality matches current filter
  const isFiltered = (feature: Feature | undefined): boolean => {
    if (!feature?.properties) return false;
    if (!filteredDRS && !filteredRRAS) return true; // No filter, show all
    
    const drs = feature.properties.DRS || '';
    const rras = feature.properties.RRAS || '';
    
    if (filteredDRS && drs !== filteredDRS) return false;
    if (filteredRRAS && rras !== filteredRRAS) return false;
    return true;
  };

  // Obtém a cor do município baseado no porte populacional
  const getPorteColor = (nome: string): string => {
    const nomeNormalizado = normalizeNome(nome);
    const municipioData = populacaoData.get(nomeNormalizado);
    if (municipioData) {
      return PORTE_COLORS[municipioData.porte];
    }
    return '#e2e8f0'; // Cor padrão se não encontrar
  };

  const getStyle = (feature: Feature | undefined): PathOptions => {
    if (!feature?.properties) return { fillColor: '#e2e8f0', weight: 1, color: '#94a3b8', fillOpacity: 0.7 };
    
    const nome = feature.properties.Municipio || feature.properties.NM_MUN || '';
    const isRespondido = respondidos.has(normalizeNome(nome));
    const isHovered = hoveredMunicipio === nome;
    const matchesFilter = isFiltered(feature);
    
    // If filtered and doesn't match, make it very faded
    if (!matchesFilter) {
      return {
        fillColor: '#f1f5f9',
        weight: 0.3,
        color: '#cbd5e1',
        fillOpacity: 0.3,
      };
    }
    
    // Modo de visualização por porte populacional
    if (viewMode === 'porte') {
      // Aplicar filtro de respondidos/pendentes no modo porte
      const shouldFade = (porteFilter === 'respondidos' && !isRespondido) || 
                         (porteFilter === 'pendentes' && isRespondido);
      
      if (shouldFade) {
        return {
          fillColor: '#f1f5f9',
          weight: 0.3,
          color: '#cbd5e1',
          fillOpacity: 0.2,
        };
      }
      
      const porteColor = getPorteColor(nome);
      return {
        fillColor: porteColor,
        weight: isHovered ? 2 : 0.5,
        color: isHovered ? '#1e293b' : '#64748b',
        fillOpacity: isHovered ? 0.95 : 0.8,
      };
    }
    
    // Modo de visualização por respondentes (padrão)
    return {
      fillColor: isRespondido ? '#10b981' : '#e2e8f0',
      weight: isHovered ? 2 : 0.5,
      color: isHovered ? '#4f46e5' : '#94a3b8',
      fillOpacity: isHovered ? 0.9 : 0.7,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, { Municipio?: string; NM_MUN?: string }>, layer: Layer) => {
    const nome = feature.properties?.Municipio || feature.properties?.NM_MUN || '';
    
    layer.on({
      mouseover: () => {
        setHoveredMunicipio(nome);
      },
      mouseout: () => {
        setHoveredMunicipio(null);
      },
      click: () => {
        if (onMunicipioClick) {
          onMunicipioClick(nome);
        }
      }
    });
    
    layer.bindTooltip(nome, {
      permanent: false,
      direction: 'top',
      className: 'bg-white px-2 py-1 rounded shadow-lg text-sm font-medium'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  const spBounds: [[number, number], [number, number]] = [[-25.5, -53.5], [-19.5, -44.0]];

  // Obtém informações do município para o tooltip
  const getMunicipioInfo = (nome: string): string => {
    const nomeNormalizado = normalizeNome(nome);
    const municipioData = populacaoData.get(nomeNormalizado);
    if (municipioData && viewMode === 'porte') {
      const populacaoFormatada = municipioData.populacao.toLocaleString('pt-BR');
      return `${nome} - ${populacaoFormatada} hab. (${getPorteLabel(municipioData.porte)})`;
    }
    return nome;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full">
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              {viewMode === 'respondentes' ? 'Mapa de Municípios Respondentes' : 'Mapa por Porte Populacional'}
            </h3>
            <p className="text-xs text-slate-500">
              {filteredDRS || filteredRRAS ? `Filtrado: ${filteredDRS || ''} ${filteredRRAS || ''}`.trim() : 'Clique em um município para ver detalhes'}
            </p>
          </div>
          
          {/* Seletor de modo de visualização */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('respondentes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'respondentes'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Respondentes
            </button>
            <button
              onClick={() => setViewMode('porte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'porte'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Porte
            </button>
          </div>
        </div>
        
        {/* Filtro de respondidos/pendentes no modo Porte */}
        {viewMode === 'porte' && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">Filtrar:</span>
            <div className="flex bg-slate-100 rounded-md p-0.5">
              <button
                onClick={() => setPorteFilter('todos')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  porteFilter === 'todos'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPorteFilter('respondidos')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  porteFilter === 'respondidos'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Respondidos
              </button>
              <button
                onClick={() => setPorteFilter('pendentes')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  porteFilter === 'pendentes'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="h-[580px] relative">
        <MapContainer
          bounds={spBounds}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {geoData && (
            <GeoJSON
              key={geoKey}
              data={geoData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}
          <MapController bounds={spBounds} />
        </MapContainer>
        
        {/* Legenda para modo Respondentes */}
        {viewMode === 'respondentes' && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
            <p className="text-xs font-semibold text-slate-700 mb-2">Legenda</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                <span className="text-xs text-slate-600">Respondido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-200"></div>
                <span className="text-xs text-slate-600">Pendente</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Legenda para modo Porte Populacional */}
        {viewMode === 'porte' && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 z-[1000] min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-600" />
              <p className="text-xs font-semibold text-slate-700">Porte Populacional</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: PORTE_COLORS.pequeno_i }}></div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-slate-700">{getPorteLabel('pequeno_i')}</span>
                  <p className="text-[10px] text-slate-500">{getPorteDescricao('pequeno_i')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: PORTE_COLORS.pequeno_ii }}></div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-slate-700">{getPorteLabel('pequeno_ii')}</span>
                  <p className="text-[10px] text-slate-500">{getPorteDescricao('pequeno_ii')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: PORTE_COLORS.medio }}></div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-slate-700">{getPorteLabel('medio')}</span>
                  <p className="text-[10px] text-slate-500">{getPorteDescricao('medio')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: PORTE_COLORS.grande }}></div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-slate-700">{getPorteLabel('grande')}</span>
                  <p className="text-[10px] text-slate-500">{getPorteDescricao('grande')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mini gráfico de barras para modo Porte */}
        {viewMode === 'porte' && municipiosCompletos.length > 0 && (() => {
          const totaisPorPorte = {
            pequeno_i: { total: 0, respondidos: 0 },
            pequeno_ii: { total: 0, respondidos: 0 },
            medio: { total: 0, respondidos: 0 },
            grande: { total: 0, respondidos: 0 },
          };
          
          municipiosCompletos.forEach(m => {
            totaisPorPorte[m.porte].total++;
            if (respondidos.has(m.nomeNormalizado)) {
              totaisPorPorte[m.porte].respondidos++;
            }
          });
          
          const totalGeral = municipiosCompletos.length;
          const totalRespondidos = Array.from(respondidos).length;
          
          const portes: Array<{ key: PortePopulacional; label: string }> = [
            { key: 'pequeno_i', label: 'Peq. I' },
            { key: 'pequeno_ii', label: 'Peq. II' },
            { key: 'medio', label: 'Médio' },
            { key: 'grande', label: 'Grande' },
          ];
          
          return (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 z-[1000] min-w-[180px]">
              <p className="text-xs font-semibold text-slate-700 mb-3">Distribuição por Porte</p>
              <div className="space-y-2.5">
                {portes.map(({ key, label }) => {
                  const dados = totaisPorPorte[key];
                  const pctTotal = totalGeral > 0 ? (dados.total / totalGeral) * 100 : 0;
                  const pctResp = dados.total > 0 ? (dados.respondidos / dados.total) * 100 : 0;
                  
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-slate-600">{label}</span>
                        <span className="text-slate-500">{dados.total} ({pctTotal.toFixed(0)}%)</span>
                      </div>
                      <div className="relative h-4 bg-slate-100 rounded overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 rounded transition-all"
                          style={{ 
                            width: `${pctTotal}%`, 
                            backgroundColor: PORTE_COLORS[key],
                            opacity: 0.3
                          }}
                        />
                        <div 
                          className="absolute inset-y-0 left-0 rounded transition-all"
                          style={{ 
                            width: `${(dados.respondidos / totalGeral) * 100}%`, 
                            backgroundColor: PORTE_COLORS[key]
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-slate-700">
                          {dados.respondidos}/{dados.total} ({pctResp.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-semibold text-emerald-600">
                    {totalRespondidos}/{totalGeral} ({totalGeral > 0 ? ((totalRespondidos / totalGeral) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      
      {hoveredMunicipio && (
        <div className={`p-3 border-t ${viewMode === 'porte' ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
          <p className="text-sm">
            <span className={`font-medium ${viewMode === 'porte' ? 'text-blue-700' : 'text-indigo-700'}`}>
              {getMunicipioInfo(hoveredMunicipio)}
            </span>
            {viewMode === 'respondentes' && (
              <span className="text-indigo-500 ml-2">
                {respondidos.has(normalizeNome(hoveredMunicipio)) ? '✓ Respondido' : 'Pendente'}
              </span>
            )}
          </p>
        </div>
      )}
      
      {/* Botão para abrir/fechar tabela de estatísticas */}
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Estatísticas por Região</span>
        </div>
        {showTable ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      
      {/* Tabela de estatísticas por região */}
      {showTable && (
        <div className="border-t border-slate-200">
          {/* Filtro de tipo de região e controles */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Agrupar por:</span>
                <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                  <button
                    onClick={() => setTipoRegiao('rras')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tipoRegiao === 'rras'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    RRAS
                  </button>
                  <button
                    onClick={() => setTipoRegiao('drs')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tipoRegiao === 'drs'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    DRS
                  </button>
                  <button
                    onClick={() => setTipoRegiao('regiaoSaude')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tipoRegiao === 'regiaoSaude'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Região de Saúde
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Ordenação */}
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={`${ordenacao}-${ordenacaoDirecao}`}
                    onChange={(e) => {
                      const [tipo, direcao] = e.target.value.split('-') as [OrdenacaoTipo, OrdenacaoDirecao];
                      setOrdenacao(tipo);
                      setOrdenacaoDirecao(direcao);
                    }}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="nome-asc">Nome (A-Z)</option>
                    <option value="nome-desc">Nome (Z-A)</option>
                    <option value="total-desc">Total (maior)</option>
                    <option value="total-asc">Total (menor)</option>
                    <option value="respondidos-desc">Respondidos (maior)</option>
                    <option value="respondidos-asc">Respondidos (menor)</option>
                    <option value="pct-desc">% Resposta (maior)</option>
                    <option value="pct-asc">% Resposta (menor)</option>
                  </select>
                </div>
                
                {/* Botão Exportar */}
                <button
                  onClick={exportarCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabela */}
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th rowSpan={2} className="text-left p-2 border-b border-r border-slate-200 font-semibold text-slate-700 min-w-[120px]">
                    {tipoRegiao === 'rras' ? 'RRAS' : tipoRegiao === 'drs' ? 'DRS' : 'Região de Saúde'}
                  </th>
                  <th colSpan={2} className="text-center p-1.5 border-b border-r border-slate-200 font-semibold text-slate-700" style={{ backgroundColor: PORTE_COLORS.pequeno_i + '40' }}>
                    Pequeno I
                  </th>
                  <th colSpan={2} className="text-center p-1.5 border-b border-r border-slate-200 font-semibold text-slate-700" style={{ backgroundColor: PORTE_COLORS.pequeno_ii + '40' }}>
                    Pequeno II
                  </th>
                  <th colSpan={2} className="text-center p-1.5 border-b border-r border-slate-200 font-semibold text-slate-700" style={{ backgroundColor: PORTE_COLORS.medio + '40' }}>
                    Médio
                  </th>
                  <th colSpan={2} className="text-center p-1.5 border-b border-slate-200 font-semibold text-slate-700" style={{ backgroundColor: PORTE_COLORS.grande + '40' }}>
                    Grande
                  </th>
                </tr>
                <tr>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600 font-medium">Total</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-700 font-medium">Resp.</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600 font-medium">Total</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-700 font-medium">Resp.</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600 font-medium">Total</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-700 font-medium">Resp.</th>
                  <th className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600 font-medium">Total</th>
                  <th className="text-center p-1.5 border-b border-slate-200 text-emerald-700 font-medium">Resp.</th>
                </tr>
              </thead>
              <tbody>
                {estatisticasOrdenadas.map((stat, idx) => {
                  const formatCell = (total: number, resp: number) => {
                    if (total === 0) return { totalStr: '-', respStr: '-' };
                    const pct = total > 0 ? Math.round((resp / total) * 100) : 0;
                    return {
                      totalStr: `${total}`,
                      respStr: `${resp} (${pct}%)`
                    };
                  };
                  
                  const p1 = formatCell(stat.total.pequeno_i, stat.respondidos.pequeno_i);
                  const p2 = formatCell(stat.total.pequeno_ii, stat.respondidos.pequeno_ii);
                  const m = formatCell(stat.total.medio, stat.respondidos.medio);
                  const g = formatCell(stat.total.grande, stat.respondidos.grande);
                  
                  return (
                    <tr key={stat.nome} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-700 truncate max-w-[150px]" title={stat.nome}>
                        {stat.nome}
                      </td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600">{p1.totalStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-600 font-medium">{p1.respStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600">{p2.totalStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-600 font-medium">{p2.respStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600">{m.totalStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-emerald-600 font-medium">{m.respStr}</td>
                      <td className="text-center p-1.5 border-b border-r border-slate-200 text-slate-600">{g.totalStr}</td>
                      <td className="text-center p-1.5 border-b border-slate-200 text-emerald-600 font-medium">{g.respStr}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                {(() => {
                  const totals = estatisticas.reduce((acc, stat) => ({
                    p1_total: acc.p1_total + stat.total.pequeno_i,
                    p1_resp: acc.p1_resp + stat.respondidos.pequeno_i,
                    p2_total: acc.p2_total + stat.total.pequeno_ii,
                    p2_resp: acc.p2_resp + stat.respondidos.pequeno_ii,
                    m_total: acc.m_total + stat.total.medio,
                    m_resp: acc.m_resp + stat.respondidos.medio,
                    g_total: acc.g_total + stat.total.grande,
                    g_resp: acc.g_resp + stat.respondidos.grande,
                  }), { p1_total: 0, p1_resp: 0, p2_total: 0, p2_resp: 0, m_total: 0, m_resp: 0, g_total: 0, g_resp: 0 });
                  
                  const formatTotal = (total: number, resp: number) => {
                    const pct = total > 0 ? Math.round((resp / total) * 100) : 0;
                    return `${resp} (${pct}%)`;
                  };
                  
                  return (
                    <tr>
                      <td className="p-2 border-t-2 border-r border-slate-300 text-slate-700">TOTAL</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-slate-700">{totals.p1_total}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-emerald-700">{formatTotal(totals.p1_total, totals.p1_resp)}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-slate-700">{totals.p2_total}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-emerald-700">{formatTotal(totals.p2_total, totals.p2_resp)}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-slate-700">{totals.m_total}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-emerald-700">{formatTotal(totals.m_total, totals.m_resp)}</td>
                      <td className="text-center p-1.5 border-t-2 border-r border-slate-300 text-slate-700">{totals.g_total}</td>
                      <td className="text-center p-1.5 border-t-2 border-slate-300 text-emerald-700">{formatTotal(totals.g_total, totals.g_resp)}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
