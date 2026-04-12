const fs = require('fs');
const Papa = require('papaparse');

const csvPath = 'public/data/respostas.csv';
const buffer = fs.readFileSync(csvPath);
const csvText = buffer.toString('latin1');

Papa.parse(csvText, {
  header: true,
  complete: (results) => {
    const data = results.data;
    const headers = Object.keys(data[0] || {});
    
    // Debug: mostrar headers relevantes
    console.log('Headers que contêm "Instit":', headers.filter(h => h.includes('Instit')));
    console.log('Headers que contêm "Timestamp":', headers.filter(h => h.includes('Timestamp')));
    console.log('Headers que contêm "Complete":', headers.filter(h => h.includes('Complete')));
    
    // Encontrar coluna Complete?
    const completeCol = headers.find(h => h.includes('Complete'));
    console.log('Coluna Complete:', completeCol);
    
    // Mostrar valores únicos da coluna Complete
    const completeValues = new Set(data.map(r => r[completeCol]).filter(v => v));
    console.log('Valores únicos de Complete:', [...completeValues]);
    
    // Encontrar a coluna de instituição
    const instCol = headers.find(h => h.includes('Institui'));
    console.log('Coluna de instituição:', instCol);
    
    // Mostrar valores únicos da coluna de instituição
    const instValues = new Set(data.map(r => r[instCol]).filter(v => v));
    console.log('Valores únicos de instituição:', [...instValues]);
    console.log('');
    
    // Função para parsear timestamp M/D/YYYY HH:MM
    function parseTimestamp(ts) {
      if (!ts || ts.includes('[not completed]')) return null;
      const match = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) return null;
      return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
    }
    
    // Normalizar nome
    function normalizeNome(nome) {
      return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    }
    
    const dataInicio = null; // Desde o início
    const dataFim = new Date(2026, 3, 6, 23, 59, 59); // Até 06/04/2026
    
    console.log('Data início: Desde o início');
    console.log('Data fim:', dataFim ? dataFim.toLocaleDateString('pt-BR') : 'Toda a base');
    console.log('');
    
    // Filtrar respostas no período
    const respostasNoPeriodo = data.filter(row => {
      const ts = row['Survey Timestamp'];
      const d = parseTimestamp(ts);
      return d && (!dataInicio || d >= dataInicio) && (!dataFim || d <= dataFim);
    });
    
    // Contar TODAS as respostas de Município (Complete + Incomplete)
    const todosMunicipios = respostasNoPeriodo.filter(row => {
      const inst = row[instCol];
      return inst === 'Municipio';
    });
    
    const municipiosComplete = todosMunicipios.filter(r => r[completeCol] === 'Complete');
    const municipiosIncomplete = todosMunicipios.filter(r => r[completeCol] === 'Incomplete');
    
    console.log('=== CONTAGEM DE RESPOSTAS DE MUNICÍPIO ===');
    console.log('Total (Complete + Incomplete):', todosMunicipios.length);
    console.log('- Complete:', municipiosComplete.length);
    console.log('- Incomplete:', municipiosIncomplete.length);
    console.log('');
    
    // Filtrar apenas municípios completos (usando coluna Complete?)
    const municipiosCompletos = municipiosComplete;
    
    // Extrair municípios únicos (com deduplicação)
    const municipiosUnicos = new Set();
    const municipiosPorResposta = new Map(); // Para debug
    const regiaoColumns = headers.filter(h => 
      (h.startsWith('Regi') || h.startsWith('Região')) && 
      !h.includes('DRS') &&
      !h.includes('Selecione')
    );
    
    // Mostrar as colunas de região
    console.log('Colunas de região:', regiaoColumns.slice(0, 3), '...');
    
    // Carregar lista de municípios válidos do SP
    const municipiosJson = fs.readFileSync('public/data/sp_municipios.json', 'utf8');
    const geoData = JSON.parse(municipiosJson);
    const municipiosValidos = new Set(geoData.features.map(f => 
      f.properties.Municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
    ));
    console.log('Municípios válidos na base:', municipiosValidos.size);
    
    console.log('Colunas de região encontradas:', regiaoColumns.length);
    
    // Ordenar por timestamp (mais antigo primeiro para pegar primeira resposta)
    const ordenados = [...municipiosCompletos].sort((a, b) => {
      const dateA = parseTimestamp(a['Survey Timestamp'])?.getTime() || 0;
      const dateB = parseTimestamp(b['Survey Timestamp'])?.getTime() || 0;
      return dateA - dateB;
    });
    
    let respostasContadas = 0;
    
    for (const row of ordenados) {
      let municipiosDestaResposta = [];
      let temMunicipioNovo = false;
      
      for (const col of regiaoColumns) {
        const val = row[col];
        if (val && val.trim()) {
          const munis = val.split(';').map(m => normalizeNome(m));
          munis.forEach(m => {
            if (m && m.length > 2 && municipiosValidos.has(m)) {
              municipiosDestaResposta.push(m);
              if (!municipiosUnicos.has(m)) {
                temMunicipioNovo = true;
              }
            }
          });
        }
      }
      
      // Adicionar municípios únicos
      if (temMunicipioNovo) {
        respostasContadas++;
        municipiosDestaResposta.forEach(m => municipiosUnicos.add(m));
      }
      
      municipiosPorResposta.set(row['Record ID'], municipiosDestaResposta);
    }
    
    console.log('');
    console.log('=== ANÁLISE DO PERÍODO 20/03/2026 a 06/04/2026 ===');
    console.log('');
    console.log('Total de linhas no CSV:', data.filter(r => r['Record ID']).length);
    console.log('Respostas no período (todas):', respostasNoPeriodo.length);
    console.log('Respostas de Município completas no período:', municipiosCompletos.length);
    console.log('');
    console.log('Respostas únicas contadas (sem duplicados):', respostasContadas);
    console.log('Municípios únicos respondidos:', municipiosUnicos.size);
    
    // Verificar duplicados
    const municipioCount = new Map();
    for (const row of municipiosCompletos) {
      for (const col of regiaoColumns) {
        const val = row[col];
        if (val && val.trim()) {
          const munis = val.split(';').map(m => normalizeNome(m));
          munis.forEach(m => {
            if (m && m.length > 2 && municipiosValidos.has(m)) {
              municipioCount.set(m, (municipioCount.get(m) || 0) + 1);
            }
          });
        }
      }
    }
    
    const duplicados = [...municipioCount.entries()].filter(([m, count]) => count > 1);
    console.log('');
    console.log('Municípios com mais de uma resposta:', duplicados.length);
    if (duplicados.length > 0 && duplicados.length <= 20) {
      console.log('Lista de duplicados:');
      duplicados.sort((a, b) => b[1] - a[1]).forEach(([m, count]) => {
        console.log(`  - ${m}: ${count} respostas`);
      });
    }
    
    // Calcular total de respostas duplicadas
    const totalRespostasDuplicadas = duplicados.reduce((acc, [m, count]) => acc + (count - 1), 0);
    console.log('');
    console.log('=== RESUMO DUPLICADOS ===');
    console.log('Total de respostas que são duplicadas:', totalRespostasDuplicadas);
    console.log('Respostas únicas (433 - duplicadas):', municipiosCompletos.length - totalRespostasDuplicadas);
    
    // Mostrar timestamps das primeiras e últimas respostas
    const timestamps = municipiosCompletos.map(r => r['Survey Timestamp']).sort();
    console.log('');
    console.log('Primeira resposta:', timestamps[0]);
    console.log('Última resposta:', timestamps[timestamps.length - 1]);
    
    // Contar por dia para debug
    const porDia = {};
    municipiosCompletos.forEach(r => {
      const ts = r['Survey Timestamp'];
      const match = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const dia = `${match[1].padStart(2,'0')}/${match[2].padStart(2,'0')}/${match[3]}`;
        porDia[dia] = (porDia[dia] || 0) + 1;
      }
    });
    console.log('');
    console.log('Respostas por dia:');
    Object.entries(porDia).sort().forEach(([dia, count]) => {
      console.log(`  ${dia}: ${count}`);
    });
  }
});
