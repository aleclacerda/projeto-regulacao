import Papa from 'papaparse';
import type { Municipio, Resposta } from '../types';

export function normalizeNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GeoJSONFeature {
  type: string;
  properties: {
    ibge_6: number;
    Municipio: string;
    RRAS: string;
    DRS: string;
    'Regiao de': string;
    RegiaoSaude?: string;
    NM_MUN: string;
    CD_MUN: string;
    AREA_KM2: number;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

export async function loadGeoJSON(): Promise<GeoJSONData> {
  const response = await fetch('/data/sp_municipios.json');
  return response.json();
}

export async function loadMunicipios(): Promise<Municipio[]> {
  const geojson = await loadGeoJSON();
  
  return geojson.features.map(feature => ({
    codigo: String(feature.properties.ibge_6),
    nome: feature.properties.Municipio || feature.properties.NM_MUN,
    uf: 'São Paulo',
    rras: feature.properties.RRAS || '',
    drs: feature.properties.DRS || '',
    regiaoSaude: feature.properties.RegiaoSaude || feature.properties['Regiao de'] || '',
    populacao: undefined,
    coberturaAPS: undefined
  }));
}

export async function loadRespostas(): Promise<Resposta[]> {
  const response = await fetch('/data/respostas.csv');
  let text = await response.text();
  
  // Normalizar quebras de linha
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const respostas: Resposta[] = [];
        const headers = results.meta.fields || [];
        
        // Colunas L a CL são índices 11 a 89 aproximadamente (colunas de municípios)
        const municipioColumns = headers.slice(11, 90);
        
        for (const row of results.data as Record<string, string>[]) {
          const municipiosRespondidos: string[] = [];
          
          // Extrair municípios das colunas L-CL
          for (const col of municipioColumns) {
            const value = row[col];
            if (value && value.trim() && !['Unchecked', 'Checked', ''].includes(value.trim())) {
              municipiosRespondidos.push(value.trim());
            }
          }
          
          // Verifica se está completo: coluna Complete? = 'Complete' E timestamp não contém '[not completed]'
          // Também ignora respostas de teste (nome = 'teste')
          const timestamp = row['Survey Timestamp'] || '';
          const nomeResp = (row['Nome completo do respondente:'] || '').toLowerCase().trim();
          const isTestResponse = nomeResp === 'teste' || nomeResp.includes('test');
          const isComplete = row['Complete?'] === 'Complete' && !timestamp.includes('[not completed]') && !isTestResponse;
          
          respostas.push({
            recordId: row['Record ID'] || '',
            timestamp: row['Survey Timestamp'] || '',
            nomeRespondente: row['Nome completo do respondente:'] || '',
            cargo: row['Cargo do respondente'] || '',
            tempoAtuacao: row['Tempo de atuação do respondente'] || '',
            email: row['Contato do respondente (e-mail institucional)'] || '',
            telefone: row['Contato do respondente (telefone comercial)'] || '',
            instituicao: row['Instituição do respondente'] || '',
            drs: row['Selecione a DRS a qual você pertence:'] || '',
            municipiosRespondidos,
            complete: isComplete,
            respostas: row
          });
        }
        
        resolve(respostas);
      }
    });
  });
}

export function getMunicipiosRespondidos(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const respondidos = new Set<string>();
  
  // Se temos a base de municípios, criar um set normalizado para validação
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  for (const resposta of respostas) {
    if (resposta.complete) {
      for (const municipio of resposta.municipiosRespondidos) {
        const normalizado = normalizeNome(municipio);
        // Se temos base de validação, só adiciona se for município válido
        if (!municipiosValidos || municipiosValidos.has(normalizado)) {
          respondidos.add(normalizado);
        }
      }
    }
  }
  
  return respondidos;
}

export function calcularKPIs(
  municipios: Municipio[],
  respostas: Resposta[],
  filtro?: { rras?: string; drs?: string }
) {
  let municipiosFiltrados = municipios;
  
  if (filtro?.rras) {
    municipiosFiltrados = municipiosFiltrados.filter(m => m.rras === filtro.rras);
  }
  if (filtro?.drs) {
    municipiosFiltrados = municipiosFiltrados.filter(m => m.drs === filtro.drs);
  }
  
  const respondidos = getMunicipiosRespondidos(respostas, municipios);
  
  const municipiosRespondidos = municipiosFiltrados.filter(m => 
    respondidos.has(normalizeNome(m.nome))
  );
  
  const drsSet = new Set(municipiosFiltrados.map(m => m.drs));
  const rrasSet = new Set(municipiosFiltrados.map(m => m.rras));
  
  // DRS só é completa quando 100% dos municípios responderam
  const drsCompletas = [...drsSet].filter(drs => {
    const municipiosDRS = municipiosFiltrados.filter(m => m.drs === drs);
    const respondidosDRS = municipiosDRS.filter(m => respondidos.has(normalizeNome(m.nome)));
    return municipiosDRS.length > 0 && respondidosDRS.length === municipiosDRS.length;
  });
  
  // RRAS só é coberta quando 100% dos municípios responderam
  const rrasCobertas = [...rrasSet].filter(rras => {
    const municipiosRRAS = municipiosFiltrados.filter(m => m.rras === rras);
    const respondidosRRAS = municipiosRRAS.filter(m => respondidos.has(normalizeNome(m.nome)));
    return municipiosRRAS.length > 0 && respondidosRRAS.length === municipiosRRAS.length;
  });
  
  return {
    totalMunicipios: municipiosFiltrados.length,
    municipiosRespondidos: municipiosRespondidos.length,
    percentualRespondido: municipiosFiltrados.length > 0 
      ? (municipiosRespondidos.length / municipiosFiltrados.length) * 100 
      : 0,
    totalDRS: drsSet.size,
    drsCompletas: drsCompletas.length,
    percentualDRS: drsSet.size > 0 ? (drsCompletas.length / drsSet.size) * 100 : 0,
    totalRRAS: rrasSet.size,
    rrasCobertas: rrasCobertas.length,
    percentualRRAS: rrasSet.size > 0 ? (rrasCobertas.length / rrasSet.size) * 100 : 0
  };
}

export function getMunicipiosPendentes(
  municipios: Municipio[],
  respostas: Resposta[],
  filtro?: { rras?: string; drs?: string }
): Municipio[] {
  let municipiosFiltrados = municipios;
  
  if (filtro?.rras) {
    municipiosFiltrados = municipiosFiltrados.filter(m => m.rras === filtro.rras);
  }
  if (filtro?.drs) {
    municipiosFiltrados = municipiosFiltrados.filter(m => m.drs === filtro.drs);
  }
  
  const respondidos = getMunicipiosRespondidos(respostas, municipios);
  
  return municipiosFiltrados.filter(m => !respondidos.has(normalizeNome(m.nome)));
}
