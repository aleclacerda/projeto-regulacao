import { useEffect, useRef } from 'react';
import type { Municipio } from '../types';

interface SPMapProps {
  municipios: Municipio[];
  respondidos: Set<string>;
  selectedMunicipio?: string | null;
  onMunicipioClick?: (nome: string) => void;
}

export function SPMap({ municipios, respondidos, selectedMunicipio, onMunicipioClick }: SPMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const drsGroups = new Map<string, Municipio[]>();
    municipios.forEach(m => {
      const list = drsGroups.get(m.drs) || [];
      list.push(m);
      drsGroups.set(m.drs, list);
    });

    const drsColors: Record<string, string> = {
      'DRS I - Grande São Paulo': '#3b82f6',
      'DRS II - Araçatuba': '#10b981',
      'DRS III - Araraquara': '#f59e0b',
      'DRS IV - Baixada Santista': '#ef4444',
      'DRS V - Barretos': '#8b5cf6',
      'DRS VI -  Bauru': '#ec4899',
      'DRS VII -  Campinas': '#06b6d4',
      'DRS VIII - Franca': '#84cc16',
      'DRS IX - Marília': '#f97316',
      'DRS X -  Piracicaba': '#14b8a6',
      'DRS XI -  Presidente Prudente': '#a855f7',
      'DRS XII -  Registro': '#22c55e',
      'DRS XIII - Ribeirão Preto': '#eab308',
      'DRS XIV - São João da Boa Vista': '#0ea5e9',
      'DRS XV - São José do Rio Preto': '#d946ef',
      'DRS XVI - Sorocaba': '#64748b',
      'DRS XVII - Taubaté': '#f43f5e'
    };

    const gridCols = Math.ceil(Math.sqrt(municipios.length * 1.5));
    const gridRows = Math.ceil(municipios.length / gridCols);
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;

    municipios.forEach((m, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = col * cellWidth;
      const y = row * cellHeight;

      const normalizedName = m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isRespondido = respondidos.has(normalizedName);
      const isSelected = selectedMunicipio === m.nome;

      let baseColor = drsColors[m.drs] || '#94a3b8';
      
      if (isRespondido) {
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.8;
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.globalAlpha = 0.6;
      }

      ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      ctx.globalAlpha = 1;

      if (isSelected) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }
    });

    ctx.fillStyle = '#334155';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mapa de São Paulo - Visualização por DRS', width / 2, 20);

  }, [municipios, respondidos, selectedMunicipio]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMunicipioClick || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridCols = Math.ceil(Math.sqrt(municipios.length * 1.5));
    const cellWidth = canvasRef.current.width / gridCols;
    const cellHeight = canvasRef.current.height / Math.ceil(municipios.length / gridCols);

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    const index = row * gridCols + col;

    if (index >= 0 && index < municipios.length) {
      onMunicipioClick(municipios[index].nome);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-700 mb-4">Mapa do Estado de São Paulo</h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onClick={handleClick}
          className="w-full h-auto cursor-pointer rounded-lg"
        />
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-sky-500"></div>
            <span className="text-xs text-slate-600">Respondido</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-300"></div>
            <span className="text-xs text-slate-600">Pendente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
