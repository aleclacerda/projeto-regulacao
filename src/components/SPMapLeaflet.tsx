import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SPMapLeafletProps {
  respondidos: Set<string>;
  onMunicipioClick?: (nome: string) => void;
  filteredDRS?: string | null;
  filteredRRAS?: string | null;
}

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

  useEffect(() => {
    fetch('/data/sp_municipios.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar GeoJSON:', err);
        setLoading(false);
      });
  }, []);

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full">
      <div className="p-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Mapa de Municípios Respondentes</h3>
        <p className="text-xs text-slate-500">
          {filteredDRS || filteredRRAS ? `Filtrado: ${filteredDRS || ''} ${filteredRRAS || ''}`.trim() : 'Clique em um município para ver detalhes'}
        </p>
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
              data={geoData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}
          <MapController bounds={spBounds} />
        </MapContainer>
        
        {/* Legenda */}
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
      </div>
      
      {hoveredMunicipio && (
        <div className="p-3 bg-indigo-50 border-t border-indigo-100">
          <p className="text-sm">
            <span className="font-medium text-indigo-700">{hoveredMunicipio}</span>
            <span className="text-indigo-500 ml-2">
              {respondidos.has(normalizeNome(hoveredMunicipio)) ? '✓ Respondido' : 'Pendente'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
