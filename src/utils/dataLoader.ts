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

// Função para identificar se uma coluna é de DRS (não é Região de Saúde)
function isDRSColumn(colName: string): boolean {
  // Colunas de DRS começam com "DRS" ou "Região - DRS" ou "Regiao - DRS"
  const normalized = colName.trim();
  return normalized.startsWith('DRS ') || 
         normalized.startsWith('Região - DRS') || 
         normalized.startsWith('Regiao - DRS') ||
         normalized.startsWith('Região - São Paulo') ||
         normalized.startsWith('Região - Campinas');
}

// Função para identificar se uma coluna é de Região de Saúde
function isRegiaoSaudeColumn(colName: string): boolean {
  // Colunas de Região de Saúde NÃO são colunas de DRS
  return !isDRSColumn(colName);
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
        
        // Colunas L a CL são índices 11 a 89 aproximadamente
        // Separar colunas de DRS e Regiões de Saúde
        const allColumns = headers.slice(12, 90); // Começa em 12 (após "Selecione a DRS")
        const regiaoSaudeColumns = allColumns.filter(col => isRegiaoSaudeColumn(col));
        
        for (const row of results.data as Record<string, string>[]) {
          const municipiosRespondidos: string[] = [];
          const regioesSaudeRespondidas: string[] = [];
          
          // Extrair dados das colunas de Região de Saúde (contém municípios)
          for (const col of regiaoSaudeColumns) {
            const value = row[col];
            if (value && value.trim() && !['Unchecked', 'Checked', ''].includes(value.trim())) {
              // O valor é o município, a coluna é a Região de Saúde
              municipiosRespondidos.push(value.trim());
              // Registrar a Região de Saúde como respondida
              if (!regioesSaudeRespondidas.includes(col)) {
                regioesSaudeRespondidas.push(col);
              }
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
            regioesSaudeRespondidas,
            complete: isComplete,
            respostas: row
          });
        }
        
        resolve(respostas);
      }
    });
  });
}

// Retorna municípios com resposta parcial (iniciaram mas não completaram)
// Considera apenas respostas de MUNICÍPIOS (não de DRS)
export function getMunicipiosEmAndamento(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const emAndamento = new Set<string>();
  const completos = getMunicipiosRespondidos(respostas, municipiosBase);
  
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  for (const resposta of respostas) {
    // Resposta iniciada mas não completa, apenas de MUNICÍPIOS
    if (!resposta.complete && resposta.recordId && resposta.timestamp && resposta.instituicao === 'Municipio') {
      for (const municipio of resposta.municipiosRespondidos) {
        const normalizado = normalizeNome(municipio);
        // Só adiciona se não está completo e é válido
        if (!completos.has(normalizado) && (!municipiosValidos || municipiosValidos.has(normalizado))) {
          emAndamento.add(normalizado);
        }
      }
    }
  }
  
  return emAndamento;
}

// Retorna DRS que responderam diretamente (coluna J = 'DRS')
export function getDRSRespondidas(respostas: Resposta[]): Set<string> {
  const drsRespondidas = new Set<string>();
  
  for (const resposta of respostas) {
    // Verifica se a instituição é DRS e a resposta está completa
    if (resposta.complete && resposta.instituicao === 'DRS') {
      if (resposta.drs) {
        drsRespondidas.add(resposta.drs);
      }
    }
  }
  
  return drsRespondidas;
}

// Retorna DRS que estão em andamento (coluna J = 'DRS' mas não completa)
export function getDRSEmAndamento(respostas: Resposta[]): Set<string> {
  const drsEmAndamento = new Set<string>();
  const drsCompletas = getDRSRespondidas(respostas);
  
  for (const resposta of respostas) {
    if (!resposta.complete && resposta.instituicao === 'DRS' && resposta.recordId) {
      if (resposta.drs && !drsCompletas.has(resposta.drs)) {
        drsEmAndamento.add(resposta.drs);
      }
    }
  }
  
  return drsEmAndamento;
}

// Retorna municípios que responderam INDIVIDUALMENTE (instituição = 'Municipio')
// NÃO inclui municípios cobertos por resposta de DRS
export function getMunicipiosRespondidos(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const respondidos = new Set<string>();
  
  // Se temos a base de municípios, criar um set normalizado para validação
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  // Adicionar APENAS municípios que responderam individualmente (instituição = 'Municipio')
  for (const resposta of respostas) {
    // Só conta respostas completas de MUNICÍPIOS (não de DRS)
    if (resposta.complete && resposta.instituicao === 'Municipio') {
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

// Retorna Regiões de Saúde que foram respondidas (completas)
export function getRegioesSaudeRespondidas(respostas: Resposta[]): Set<string> {
  const regioes = new Set<string>();
  
  for (const resposta of respostas) {
    if (resposta.complete) {
      for (const regiao of resposta.regioesSaudeRespondidas) {
        regioes.add(normalizeNome(regiao));
      }
    }
  }
  
  return regioes;
}

// Retorna Regiões de Saúde em andamento (iniciadas mas não completas)
export function getRegioesSaudeEmAndamento(respostas: Resposta[]): Set<string> {
  const emAndamento = new Set<string>();
  const completas = getRegioesSaudeRespondidas(respostas);
  
  for (const resposta of respostas) {
    if (!resposta.complete && resposta.recordId) {
      for (const regiao of resposta.regioesSaudeRespondidas) {
        const normalizado = normalizeNome(regiao);
        if (!completas.has(normalizado)) {
          emAndamento.add(normalizado);
        }
      }
    }
  }
  
  return emAndamento;
}

// Retorna todas as Regiões de Saúde únicas da base de municípios
export function getTodasRegioesSaude(municipios: Municipio[]): Set<string> {
  const regioes = new Set<string>();
  for (const m of municipios) {
    if (m.regiaoSaude) {
      regioes.add(m.regiaoSaude);
    }
  }
  return regioes;
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
  const drsRespondidas = getDRSRespondidas(respostas);
  
  const municipiosRespondidos = municipiosFiltrados.filter(m => 
    respondidos.has(normalizeNome(m.nome))
  );
  
  const drsSet = new Set(municipiosFiltrados.map(m => m.drs));
  const rrasSet = new Set(municipiosFiltrados.map(m => m.rras));
  const regiaoSaudeSet = new Set(municipiosFiltrados.map(m => m.regiaoSaude).filter(r => r));
  
  // DRS é completa quando: a DRS respondeu diretamente (coluna J = 'DRS')
  const drsCompletas = [...drsSet].filter(drs => drsRespondidas.has(drs));
  
  // RRAS só é coberta quando 100% dos municípios responderam
  const rrasCobertas = [...rrasSet].filter(rras => {
    const municipiosRRAS = municipiosFiltrados.filter(m => m.rras === rras);
    const respondidosRRAS = municipiosRRAS.filter(m => respondidos.has(normalizeNome(m.nome)));
    return municipiosRRAS.length > 0 && respondidosRRAS.length === municipiosRRAS.length;
  });
  
  // Regiões de Saúde completas apenas quando 100% dos municípios responderam
  const regioesSaudeCompletas = [...regiaoSaudeSet].filter(regiao => {
    const municipiosRegiao = municipiosFiltrados.filter(m => m.regiaoSaude === regiao);
    const respondidosRegiao = municipiosRegiao.filter(m => respondidos.has(normalizeNome(m.nome)));
    return municipiosRegiao.length > 0 && respondidosRegiao.length === municipiosRegiao.length;
  });
  
  // Contar questionários completos
  const questionariosCompletos = respostas.filter(r => r.complete).length;
  const totalQuestionarios = respostas.filter(r => r.recordId).length;
  
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
    percentualRRAS: rrasSet.size > 0 ? (rrasCobertas.length / rrasSet.size) * 100 : 0,
    totalRegioesSaude: regiaoSaudeSet.size,
    regioesSaudeRespondidas: regioesSaudeCompletas.length,
    percentualRegioesSaude: regiaoSaudeSet.size > 0 ? (regioesSaudeCompletas.length / regiaoSaudeSet.size) * 100 : 0,
    questionariosCompletos,
    totalQuestionarios,
    percentualQuestionarios: totalQuestionarios > 0 ? (questionariosCompletos / totalQuestionarios) * 100 : 0
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
