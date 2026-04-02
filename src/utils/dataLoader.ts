import Papa from 'papaparse';
import type { Municipio, Resposta, MunicipioDuplicado } from '../types';

export function normalizeNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normaliza nomes de DRS para garantir correspondência entre CSV e GeoJSON
// Corrige diferenças de espaçamento como "DRS III- Araraquara" vs "DRS III - Araraquara"
export function normalizeDRS(drs: string): string {
  return drs
    .replace(/\s*-\s*/g, ' - ')  // Normaliza espaços ao redor do hífen
    .replace(/\s+/g, ' ')         // Remove espaços duplicados
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

// Função para identificar se uma coluna é cabeçalho de DRS (agrupa regiões de saúde)
// EXCEÇÕES: DRS IV (Baixada Santista) e DRS XII (Registro) não têm sub-regiões,
// então suas colunas contêm municípios diretamente e NÃO devem ser tratadas como cabeçalhos
function isDRSHeaderColumn(colName: string): boolean {
  const normalized = colName.trim();
  
  // Exceções: DRS que não têm sub-regiões (contêm municípios diretamente)
  // DRS IV - Baixada Santista
  // DRS XII - Registro / Vale do Ribeira
  if (/DRS\s+IV\s*-/i.test(normalized) || /Baixada\s+Santista/i.test(normalized)) {
    return false;
  }
  if (/DRS\s+XII\s*-/i.test(normalized) || /Registro/i.test(normalized) || /Vale\s+do\s+Ribeira/i.test(normalized)) {
    return false;
  }
  
  // Padrões de cabeçalho de DRS:
  // "DRS XV - São José do Rio Preto"
  // "DRS VI - Bauru"
  // "Regiao - DRS II - Araçatuba"
  // "Região - DRS I - Grande São Paulo"
  // "Região - Campinas" (caso especial sem "DRS" no nome)
  return /^DRS\s+[IVXLCDM]+\s*-/i.test(normalized) || 
         /^Regi[aã]o\s*-\s*DRS\s+[IVXLCDM]+/i.test(normalized) ||
         /^Regi[aã]o\s*-\s*Campinas/i.test(normalized);
}

// Função para identificar se uma coluna é de Região de Saúde (contém municípios)
// Todas as colunas que NÃO são cabeçalhos de DRS são regiões de saúde
function isRegiaoSaudeColumn(colName: string): boolean {
  // Colunas de Região de Saúde NÃO são cabeçalhos de DRS
  // Incluem: "Região de Saúde de X", "Região Alto do Tietê", "Diadema", "Votuporanga", etc.
  return !isDRSHeaderColumn(colName);
}

export async function getDataAtualizacao(): Promise<Date | null> {
  try {
    const response = await fetch('/data/respostas.csv', { method: 'HEAD' });
    const lastModified = response.headers.get('Last-Modified');
    if (lastModified) {
      return new Date(lastModified);
    }
  } catch (err) {
    console.error('Erro ao buscar data de atualização:', err);
  }
  return null;
}

export async function loadRespostas(): Promise<Resposta[]> {
  const response = await fetch('/data/respostas.csv');
  
  // Ler como ArrayBuffer para decodificar corretamente
  const buffer = await response.arrayBuffer();
  
  // Tentar decodificar como UTF-8 primeiro, se falhar usar Latin1 (ISO-8859-1)
  let text: string;
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    text = utf8Decoder.decode(buffer);
  } catch {
    // Se UTF-8 falhar, usar Latin1 (Windows-1252)
    const latin1Decoder = new TextDecoder('windows-1252');
    text = latin1Decoder.decode(buffer);
  }
  
  // Normalizar quebras de linha
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const respostas: Resposta[] = [];
        const headers = results.meta.fields || [];
        
        // Colunas de regiões de saúde/municípios: índices 11 a 89
        // Termina antes de "Identifique as populações vulneráveis" (índice 90)
        const allColumns = headers.slice(11, 90); // Começa em 11 (DRS VII - Campinas), termina em 89 (Sul - Barretos)
        const regiaoSaudeColumns = allColumns.filter(col => isRegiaoSaudeColumn(col));
        
        for (const row of results.data as Record<string, string>[]) {
          const municipiosSet = new Set<string>();
          const regioesSaudeSet = new Set<string>();
          
          // Extrair dados das colunas de Região de Saúde (contém municípios)
          for (const col of regiaoSaudeColumns) {
            const value = row[col];
            if (value && value.trim() && !['Unchecked', 'Checked', ''].includes(value.trim())) {
              // O valor é o município, a coluna é a Região de Saúde
              // Usar Set para evitar duplicatas (mesmo município em múltiplas colunas)
              municipiosSet.add(value.trim());
              // Registrar a Região de Saúde como respondida
              regioesSaudeSet.add(col);
            }
          }
          
          const municipiosRespondidos = Array.from(municipiosSet);
          const regioesSaudeRespondidas = Array.from(regioesSaudeSet);
          
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
// Considera apenas respostas com instituição preenchida (Municipio ou DRS)
export function getMunicipiosEmAndamento(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const emAndamento = new Set<string>();
  const completos = getMunicipiosRespondidos(respostas, municipiosBase);
  
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  for (const resposta of respostas) {
    // Resposta iniciada mas não completa, COM instituição preenchida (Municipio ou DRS)
    if (!resposta.complete && resposta.recordId && 
        (resposta.instituicao === 'Municipio' || resposta.instituicao === 'DRS')) {
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
// Usa normalização para garantir correspondência entre CSV e GeoJSON
export function getDRSRespondidas(respostas: Resposta[]): Set<string> {
  const drsRespondidas = new Set<string>();
  
  for (const resposta of respostas) {
    // Verifica se a instituição é DRS e a resposta está completa
    if (resposta.complete && resposta.instituicao === 'DRS') {
      if (resposta.drs) {
        drsRespondidas.add(normalizeDRS(resposta.drs));
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
      const drsNormalizada = resposta.drs ? normalizeDRS(resposta.drs) : '';
      if (drsNormalizada && !drsCompletas.has(drsNormalizada)) {
        drsEmAndamento.add(drsNormalizada);
      }
    }
  }
  
  return drsEmAndamento;
}

// Retorna municípios que responderam INDIVIDUALMENTE (instituição = 'Municipio')
// NÃO inclui municípios cobertos por resposta de DRS
// Considera apenas a ÚLTIMA resposta de cada município (ignora duplicados anteriores)
export function getMunicipiosRespondidos(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const respondidos = new Set<string>();
  
  // Se temos a base de municípios, criar um set normalizado para validação
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  // Primeiro, identificar a última resposta de cada município
  // Ordenar respostas por timestamp (mais recente primeiro)
  const respostasOrdenadas = [...respostas]
    .filter(r => r.complete && r.instituicao === 'Municipio')
    .sort((a, b) => {
      // Ordenar por timestamp decrescente (mais recente primeiro)
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
  
  // Rastrear quais municípios já foram contados (apenas a última resposta)
  const municipiosContados = new Set<string>();
  
  for (const resposta of respostasOrdenadas) {
    for (const municipio of resposta.municipiosRespondidos) {
      const normalizado = normalizeNome(municipio);
      
      // Se já contamos este município, pular (é uma resposta duplicada anterior)
      if (municipiosContados.has(normalizado)) {
        continue;
      }
      
      // Marcar como contado
      municipiosContados.add(normalizado);
      
      // Se temos base de validação, só adiciona se for município válido
      if (!municipiosValidos || municipiosValidos.has(normalizado)) {
        respondidos.add(normalizado);
      } else {
        console.warn(`Município não encontrado na base: "${municipio}" (normalizado: "${normalizado}")`);
      }
    }
  }
  
  return respondidos;
}

// Detecta municípios que responderam mais de uma vez (duplicados)
// Não considera duplicado quando um é de Município e outro é de DRS
export function getMunicipiosDuplicados(respostas: Resposta[]): MunicipioDuplicado[] {
  const municipioRespostas = new Map<string, { recordId: string; timestamp: string; nomeRespondente: string; instituicao: string; email: string; cargo: string }[]>();
  
  // Agrupar respostas por município (apenas completas)
  for (const resposta of respostas) {
    if (resposta.complete) {
      for (const municipio of resposta.municipiosRespondidos) {
        const normalizado = normalizeNome(municipio);
        if (!municipioRespostas.has(normalizado)) {
          municipioRespostas.set(normalizado, []);
        }
        municipioRespostas.get(normalizado)!.push({
          recordId: resposta.recordId,
          timestamp: resposta.timestamp,
          nomeRespondente: resposta.nomeRespondente,
          instituicao: resposta.instituicao,
          email: resposta.email,
          cargo: resposta.cargo
        });
      }
    }
  }
  
  // Filtrar apenas os que têm mais de uma resposta da MESMA instituição
  // Não considerar duplicado quando um é Município e outro é DRS
  const duplicados: MunicipioDuplicado[] = [];
  for (const [municipio, respostasArr] of municipioRespostas) {
    if (respostasArr.length > 1) {
      // Verificar se todas as respostas são do mesmo tipo de instituição
      const instituicoes = new Set(respostasArr.map(r => r.instituicao));
      
      // Se tem tanto Município quanto DRS, não é duplicado real
      if (instituicoes.has('Municipio') && instituicoes.has('DRS')) {
        continue;
      }
      
      // Ordenar por timestamp (mais recente primeiro)
      const respostasOrdenadas = [...respostasArr].sort((a, b) => {
        const parseDate = (ts: string) => {
          if (!ts) return new Date(0);
          // Formato: "3/24/2026 14:13" ou similar
          const parts = ts.split(' ');
          if (parts.length < 2) return new Date(0);
          const dateParts = parts[0].split('/');
          const timeParts = parts[1].split(':');
          if (dateParts.length < 3) return new Date(0);
          return new Date(
            parseInt(dateParts[2]), // ano
            parseInt(dateParts[0]) - 1, // mês (0-indexed)
            parseInt(dateParts[1]), // dia
            parseInt(timeParts[0] || '0'),
            parseInt(timeParts[1] || '0')
          );
        };
        return parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime();
      });
      
      duplicados.push({
        municipio,
        respostas: respostasOrdenadas
      });
    }
  }
  
  // Ordenar por quantidade de duplicados (maior primeiro)
  return duplicados.sort((a, b) => b.respostas.length - a.respostas.length);
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
  
  const drsSet = new Set(municipiosFiltrados.map(m => normalizeDRS(m.drs)));
  const rrasSet = new Set(municipiosFiltrados.map(m => m.rras));
  const regiaoSaudeSet = new Set(municipiosFiltrados.map(m => m.regiaoSaude).filter(r => r));
  
  // DRS é completa quando: a DRS respondeu diretamente (coluna J = 'DRS')
  // Usa normalização para garantir correspondência entre CSV e GeoJSON
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

// Interface para formulários incompletos
export interface FormularioIncompleto {
  recordId: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  instituicao: string;
  drs: string;
  municipios: string[];
  timestamp: string;
}

// Retorna detalhes dos formulários incompletos (para página de gestão)
export function getFormulariosIncompletos(respostas: Resposta[]): FormularioIncompleto[] {
  return respostas
    .filter(r => !r.complete && r.recordId && r.instituicao)
    .map(r => ({
      recordId: r.recordId,
      nome: r.nomeRespondente,
      cargo: r.cargo,
      email: r.email,
      telefone: r.telefone,
      instituicao: r.instituicao,
      drs: r.drs,
      municipios: r.municipiosRespondidos,
      timestamp: r.timestamp
    }))
    .sort((a, b) => {
      // Ordenar por timestamp decrescente
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
}

// Retorna municípios únicos com formulários incompletos
export function getMunicipiosIncompletos(respostas: Resposta[], municipiosBase?: Municipio[]): Set<string> {
  const incompletos = new Set<string>();
  const completos = getMunicipiosRespondidos(respostas, municipiosBase);
  
  const municipiosValidos = municipiosBase 
    ? new Set(municipiosBase.map(m => normalizeNome(m.nome)))
    : null;
  
  for (const resposta of respostas) {
    if (!resposta.complete && resposta.recordId && resposta.instituicao === 'Municipio') {
      for (const municipio of resposta.municipiosRespondidos) {
        const normalizado = normalizeNome(municipio);
        if (!completos.has(normalizado) && (!municipiosValidos || municipiosValidos.has(normalizado))) {
          incompletos.add(normalizado);
        }
      }
    }
  }
  
  return incompletos;
}

// Retorna DRS únicas com formulários incompletos
export function getDRSIncompletas(respostas: Resposta[]): Set<string> {
  const incompletas = new Set<string>();
  const completas = getDRSRespondidas(respostas);
  
  for (const resposta of respostas) {
    if (!resposta.complete && resposta.recordId && resposta.instituicao === 'DRS') {
      if (resposta.drs && !completas.has(resposta.drs)) {
        incompletas.add(resposta.drs);
      }
    }
  }
  
  return incompletas;
}
