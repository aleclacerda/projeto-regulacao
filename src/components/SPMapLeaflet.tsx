import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadPopulacaoMunicipios, getPorteLabel, getPorteDescricao } from '../utils/dataLoader';
import type { MunicipioPopulacao, PortePopulacional } from '../utils/dataLoader';
import { Users, MapPin } from 'lucide-react';

type MapViewMode = 'respondentes' | 'porte';
type PorteFilterMode = 'todos' | 'respondidos' | 'pendentes';

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

  useEffect(() => {
    Promise.all([
      fetch('/data/sp_municipios.json').then(res => res.json()),
      loadPopulacaoMunicipios()
    ])
      .then(([geoJson, populacao]) => {
        setGeoData(geoJson);
        setPopulacaoData(populacao);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar dados:', err);
        setLoading(false);
      });
  }, []);

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
    </div>
  );
}
