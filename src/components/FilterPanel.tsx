import { Filter } from 'lucide-react';
import type { Municipio } from '../types';

interface FilterPanelProps {
  municipios: Municipio[];
  selectedRRAS: string | null;
  selectedDRS: string | null;
  selectedMunicipio: string | null;
  onRRASChange: (value: string | null) => void;
  onDRSChange: (value: string | null) => void;
  onMunicipioChange: (value: string | null) => void;
}

export function FilterPanel({
  municipios,
  selectedRRAS,
  selectedDRS,
  selectedMunicipio,
  onRRASChange,
  onDRSChange,
  onMunicipioChange
}: FilterPanelProps) {
  // Sort RRAS numerically (RRAS1, RRAS2, ... RRAS10, RRAS11, etc)
  const rrasList = [...new Set(municipios.map(m => m.rras).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  
  const drsList = [...new Set(
    municipios
      .filter(m => !selectedRRAS || m.rras === selectedRRAS)
      .map(m => m.drs)
      .filter(Boolean)
  )].sort();
  
  const municipiosList = municipios
    .filter(m => {
      if (selectedRRAS && m.rras !== selectedRRAS) return false;
      if (selectedDRS && m.drs !== selectedDRS) return false;
      return true;
    })
    .map(m => m.nome)
    .sort();

  const handleRRASChange = (value: string) => {
    onRRASChange(value || null);
    onDRSChange(null);
    onMunicipioChange(null);
  };

  const handleDRSChange = (value: string) => {
    onDRSChange(value || null);
    onMunicipioChange(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-700">Filtros</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            RRAS
          </label>
          <select
            value={selectedRRAS || ''}
            onChange={(e) => handleRRASChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">Todas as RRAS</option>
            {rrasList.map(rras => (
              <option key={rras} value={rras}>{rras}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            DRS
          </label>
          <select
            value={selectedDRS || ''}
            onChange={(e) => handleDRSChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">Todas as DRS</option>
            {drsList.map(drs => (
              <option key={drs} value={drs}>{drs}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Município
          </label>
          <select
            value={selectedMunicipio || ''}
            onChange={(e) => onMunicipioChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">Todos os municípios</option>
            {municipiosList.map(mun => (
              <option key={mun} value={mun}>{mun}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
