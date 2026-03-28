import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Filter, Network, Lock, LogOut } from 'lucide-react';
import { loadMunicipios, loadRespostas, normalizeNome } from '../utils/dataLoader';
import type { Municipio, Resposta } from '../types';
import Papa from 'papaparse';

// Credenciais de acesso
const CREDENCIAIS = {
  usuario: 'analise@resultados',
  senha: 'regulação'
};

const CORES_BARRAS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#0891b2'];

// Lista de blocos disponíveis
const BLOCOS = [
  { id: 'rras', nome: 'Papel do município na RRAS' },
  { id: 'estrutura', nome: 'Estrutura da Regulação' }
];

// Definição das perguntas do Bloco - Papel do município na RRAS
const PERGUNTAS_BLOCO_RRAS = [
  {
    id: 'papel_rras',
    coluna: 'Na organização da RRAS, qual das situações abaixo melhor descreve o papel do seu município em relação à oferta de serviços especializados e hospitalares para a população do SUS?',
    titulo: 'Papel do município na RRAS',
    tipo: 'radio',
    opcoes: [
      { label: 'Encaminha demanda', match: 'A maior parte dos atendimentos' },
      { label: 'Atende própria população', match: 'atendem predominantemente sua própria população' },
      { label: 'Atende vizinhos', match: 'também recebem pacientes de alguns municípios vizinhos' },
      { label: 'Referência regional', match: 'funcionando como referência regional' },
      { label: 'Referência estadual', match: 'de diversas regiões de saúde ou de outras RRAS' }
    ]
  },
  {
    id: 'recebe_eletivas',
    coluna: 'O município recebe pacientes encaminhados de outros municípios para realização de consultas especializadas, exames ou internações hospitalares eletivas?',
    titulo: 'Recebe pacientes para consultas eletivas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Não recebe', match: 'Não recebe' },
      { label: 'Eventualmente', match: 'Recebe eventualmente' },
      { label: 'Regularmente da região', match: 'Recebe regularmente de vários municípios da região' },
      { label: 'Regularmente de outras regiões', match: 'recebe regularmente de municípios de outras regiões' }
    ]
  },
  {
    id: 'recebe_urgencias',
    coluna: 'O município recebe pacientes encaminhados de outros municípios para atenção as urgências/emergências?',
    titulo: 'Recebe pacientes para urgências',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Não recebe', match: 'Não recebe' },
      { label: 'Eventualmente', match: 'Recebe eventualmente' },
      { label: 'Regularmente da região', match: 'Recebe regularmente de vários municípios da região' },
      { label: 'Regularmente de outras regiões', match: 'recebe regularmente de municípios de outras regiões' }
    ]
  },
  {
    id: 'destino_encaminhamento',
    coluna: 'Quando o município precisa encaminhar pacientes para serviços especializados ou hospitalares, qual é o destino mais frequente?',
    titulo: 'Destino mais frequente de encaminhamentos',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Próprio município', match: 'Serviços dentro do próprio município' },
      { label: 'Mesma região', match: 'Municípios da mesma região' },
      { label: 'Outras regiões da RRAS', match: 'Municípios de outras regiões de saúde da mesma RRAS' },
      { label: 'Outras RRAS', match: 'Municípios de outras RRAS' },
      { label: 'Serviços estaduais', match: 'Serviços estaduais especializado' }
    ]
  },
  {
    id: 'oferta_servicos',
    titulo: 'Oferta própria de serviços especializados',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Ambulatório de especialidades)', label: 'Ambulatório de especialidades' },
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Serviços de diagnóstico (tomografia, ressonância))', label: 'Serviços de diagnóstico' },
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Hospital geral)', label: 'Hospital geral' },
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Hospital com UTI)', label: 'Hospital com UTI' },
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Serviços de alta complexidade)', label: 'Alta complexidade' },
      { coluna: 'O município possui oferta própria de quais serviços especializados ou hospitalares? (choice=Não possui serviços especializados próprio)', label: 'Não possui' }
    ]
  }
];

// Definição das perguntas do Bloco - Estrutura da Regulação
const PERGUNTAS_BLOCO_ESTRUTURA = [
  {
    id: 'estrutura_formal',
    coluna: 'O município possui estrutura formal de regulação do acesso ?',
    titulo: 'Estrutura formal de regulação',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Central Municipal de Regulação', match: 'Central Municipal de Regulação' },
      { label: 'Núcleo Municipal de Regulação', match: 'Núcleo Municipal de Regulação' },
      { label: 'Regulação pela Secretaria Municipal', match: 'Regulação realizada pela Secretaria Municipal de Saúde' },
      { label: 'Regulação pela CROSS', match: 'Regulação realizada pela CROSS' },
      { label: 'NIR de Unidade de Saúde', match: 'Núcleo Interno de Regulação' },
      { label: 'NRG - Núcleo Regional de Gestão', match: 'Núcleo Regional de Gestão' },
      { label: 'Outra estrutura', match: 'Outra' }
    ]
  },
  {
    id: 'servicos_regulados',
    titulo: 'Serviços regulados pelo município',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Quais serviços são regulados pelo município?  (choice=Consultas especializadas)', label: 'Consultas especializadas' },
      { coluna: 'Quais serviços são regulados pelo município?  (choice=Exames especializado)', label: 'Exames especializados' },
      { coluna: 'Quais serviços são regulados pelo município?  (choice=Procedimentos ambulatoriais)', label: 'Procedimentos ambulatoriais' },
      { coluna: 'Quais serviços são regulados pelo município?  (choice=Leitos de urgência e emergência)', label: 'Leitos de urgência/emergência' },
      { coluna: 'Quais serviços são regulados pelo município?  (choice=Transporte sanitário)', label: 'Transporte sanitário' }
    ]
  },
  {
    id: 'gestao_oferta',
    coluna: 'O município realiza a gestão da sua oferta de serviços de saúde exclusivamente para atendimento da sua própria população?',
    titulo: 'Gestão exclusiva para própria população',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'equipe_regulacao',
    coluna: 'O município possui equipe ou profissionais formalmente dedicados às atividade de regulação do acesso ?',
    titulo: 'Equipe dedicada à regulação',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, equipe formal estruturada', match: 'Sim, existe equipe formal estruturada' },
      { label: 'Profissionais designados sem equipe', match: 'Sim, existem profissionais designados, mas sem equipe formal estruturada' },
      { label: 'Não há profissionais dedicados', match: 'Não há profissionais dedicados exclusivamente à regulação' },
      { label: 'Não sei informar', match: 'Não sei informar' }
    ]
  },
  {
    id: 'medico_regulador',
    coluna: 'A equipe possui profissional médico regulador?',
    titulo: 'Possui médico regulador',
    tipo: 'radio',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'outro_profissional',
    coluna: 'A equipe possui outro profissional do nível superior regulador?',
    titulo: 'Outro profissional de nível superior',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Enfermeiro', match: 'Enfermeiro' },
      { label: 'Dentista', match: 'Dentista' },
      { label: 'Assistente social', match: 'Assistente social' },
      { label: 'Outro', match: 'Outro' }
    ]
  },
  {
    id: 'recursos_tecnicos',
    coluna: ' A estrutura atual da regulação do acesso possui recursos humanos e técnicos suficientes para cumprir suas atribuições?',
    titulo: 'Recursos humanos e técnicos suficientes',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'mecanismo_remoto',
    titulo: 'Mecanismos remotos de apoio à regulação',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'O munícipio utiliza algum mecanismo remoto de apoio a regulação do acesso? (choice=Teleconsultoria entre APS e Especialista)', label: 'Teleconsultoria APS-Especialista' },
      { coluna: 'O munícipio utiliza algum mecanismo remoto de apoio a regulação do acesso? (choice=Teleinterconsulta entre os profissionais)', label: 'Teleinterconsulta' },
      { coluna: 'O munícipio utiliza algum mecanismo remoto de apoio a regulação do acesso? (choice=Telerregulação (avaliação remota por regulador ou especialista))', label: 'Telerregulação' },
      { coluna: 'O munícipio utiliza algum mecanismo remoto de apoio a regulação do acesso? (choice=Não utiliza)', label: 'Não utiliza' },
      { coluna: 'O munícipio utiliza algum mecanismo remoto de apoio a regulação do acesso? (choice=Outro)', label: 'Outro' }
    ]
  },
  {
    id: 'transporte_sanitario',
    coluna: 'O transporte sanitário está integrado à regulação municipal da rede?  Transporte sanitário é o serviço destinado ao deslocamento de usuários do SUS entre pontos de atenção à saúde, com o objetivo de garantir o acesso a ações e serviços assistenciais, podendo ocorrer de forma programada ou não programada, e com ou sem necessidade de suporte assistencial durante o trajeto.',
    titulo: 'Transporte sanitário integrado',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' },
      { label: 'Em implantação', match: 'Em implantação' }
    ]
  },
  {
    id: 'atendimento_pre_hospitalar',
    titulo: 'Atendimento pré-hospitalar móvel',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'O município possui serviço organizado de atendimento pré-hospitalar móvel? (choice=SAMU Municipal)', label: 'SAMU Municipal' },
      { coluna: 'O município possui serviço organizado de atendimento pré-hospitalar móvel? (choice=SAMU Regional)', label: 'SAMU Regional' },
      { coluna: 'O município possui serviço organizado de atendimento pré-hospitalar móvel? (choice=Serviço municipal de ambulâncias)', label: 'Serviço municipal de ambulâncias' },
      { coluna: 'O município possui serviço organizado de atendimento pré-hospitalar móvel? (choice=Não possui serviço estruturado)', label: 'Não possui serviço estruturado' },
      { coluna: 'O município possui serviço organizado de atendimento pré-hospitalar móvel? (choice=Outro)', label: 'Outro' }
    ]
  },
  {
    id: 'sistemas_regulacao',
    titulo: 'Sistemas utilizados para regulação',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Quais sistemas são utilizados para regulação assistencial no território? (choice=Sistema municipal próprio)', label: 'Sistema municipal próprio' },
      { coluna: 'Quais sistemas são utilizados para regulação assistencial no território? (choice=Sistema regional)', label: 'Sistema regional' },
      { coluna: 'Quais sistemas são utilizados para regulação assistencial no território? (choice=SIRESP)', label: 'SIRESP' },
      { coluna: 'Quais sistemas são utilizados para regulação assistencial no território? (choice=Planilhas ou registros manuais)', label: 'Planilhas/registros manuais' },
      { coluna: 'Quais sistemas são utilizados para regulação assistencial no território? (choice=Outro)', label: 'Outro' }
    ]
  },
  {
    id: 'integracao_sistemas',
    coluna: 'O sistema de regulação do acesso utilizado no território possui integração com outros sistemas de informação em saúde (ex.: prontuário eletrônico da APS, sistemas hospitalares ou sistemas estaduais)?',
    titulo: 'Integração com outros sistemas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, integração automática', match: 'Sim, integração automática entre sistemas' },
      { label: 'Sim, integração parcial', match: 'Sim, integração parcial' },
      { label: 'Não existe integração', match: 'Não existe integração entre sistemas' }
    ]
  },
  {
    id: 'ia_regulacao',
    coluna: 'O sistema informatizado de regulação do acesso utilizado no território possui funcionalidades baseadas em inteligência artificial ou algoritmos automatizados para apoio à gestão da fila ou priorização das solicitações?',
    titulo: 'IA/Algoritmos para gestão de fila',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, de forma estruturada', match: 'Sim , de forma estruturada' },
      { label: 'Em fase piloto/desenvolvimento', match: 'Sim em fase piloto ou em desenvolvimento' },
      { label: 'Não possui atualmente', match: 'Não possui atualmente' }
    ]
  },
  {
    id: 'qtd_profissionais',
    coluna: 'Quantos profissionais atuam diretamente na regulação do acesso ? (quantidade)',
    titulo: 'Quantidade de profissionais na regulação',
    tipo: 'numerico'
  },
  {
    id: 'oferta_apoio_remoto',
    coluna: 'Quem oferta o serviço de apoio remoto utilizado na qualificação da regulação do acesso ?',
    titulo: 'Quem oferta o serviço de apoio remoto',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Ministério da Saúde', match: 'Ministério da Saúde' },
      { label: 'Secretaria Estadual de Saúde', match: 'Secretaria Estadual de Saúde' },
      { label: 'Secretaria Municipal de Saúde', match: 'Secretaria Municipal de Saúde' },
      { label: 'Instituição parceira/contratada', match: 'Instituição de parceira ou contratada' },
      { label: 'Universidade/Núcleo de Telessaúde', match: 'Universidade ou Núcleo do Telessaúde' },
      { label: 'Outro', match: 'Outro' }
    ]
  }
];

interface DadosBrutos {
  [key: string]: string;
}

// Tipo para resultado de análise
interface ResultadoAnalise {
  label: string;
  quantidade: number;
  percentual: number;
}

export function Analise() {
  // Estado de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('analise_auth') === 'true';
  });
  const [loginUsuario, setLoginUsuario] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginError, setLoginError] = useState('');

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [dadosBrutos, setDadosBrutos] = useState<DadosBrutos[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRRAS, setSelectedRRAS] = useState<string | null>(null);
  const [selectedDRS, setSelectedDRS] = useState<string | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
  const [selectedBloco, setSelectedBloco] = useState<string>('rras');

  // Função de login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsuario === CREDENCIAIS.usuario && loginSenha === CREDENCIAIS.senha) {
      setIsAuthenticated(true);
      sessionStorage.setItem('analise_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos');
    }
  };

  // Função de logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('analise_auth');
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [munis, resps] = await Promise.all([
          loadMunicipios(),
          loadRespostas()
        ]);
        setMunicipios(munis);
        setRespostas(resps);

        const response = await fetch('/data/respostas.csv');
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('windows-1252');
        const csvText = decoder.decode(buffer);
        
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setDadosBrutos(results.data as DadosBrutos[]);
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Listas para filtros (RRAS ordenado numericamente)
  const rrasList = [...new Set(municipios.map(m => m.rras).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  const drsList = [...new Set(municipios.map(m => m.drs).filter(Boolean))].sort();
  
  const drsListFiltrada = selectedRRAS 
    ? [...new Set(municipios.filter(m => m.rras === selectedRRAS).map(m => m.drs).filter(Boolean))].sort()
    : drsList;

  const municipiosFiltrados = municipios.filter(m => {
    if (selectedRRAS && m.rras !== selectedRRAS) return false;
    if (selectedDRS && m.drs !== selectedDRS) return false;
    return true;
  });

  const municipiosList = municipiosFiltrados.map(m => m.nome).sort();

  // Filtrar respostas completas com respondentes válidos (Municipio ou DRS)
  const respostasCompletas = respostas.filter(r => 
    r.complete && (r.instituicao === 'Municipio' || r.instituicao === 'DRS')
  );
  
  const respostasFiltradas = respostasCompletas.filter(r => {
    const municipiosResposta = r.municipiosRespondidos.map(m => normalizeNome(m));
    const municipiosValidos = new Set(municipiosFiltrados.map(m => normalizeNome(m.nome)));
    
    if (selectedMunicipio) {
      return municipiosResposta.some(m => normalizeNome(m) === normalizeNome(selectedMunicipio));
    }
    
    return municipiosResposta.some(m => municipiosValidos.has(m));
  });

  // Dados brutos filtrados (apenas Complete + Municipio/DRS, sem duplicados)
  // Usa a mesma lógica do dataLoader para contar municípios únicos
  const dadosBrutosFiltrados = (() => {
    // Filtrar respostas completas válidas (Municipio ou DRS, não teste)
    const respostasValidas = respostas.filter(r => 
      r.complete && (r.instituicao === 'Municipio' || r.instituicao === 'DRS')
    );

    // Ordenar por timestamp (mais recente primeiro)
    const ordenadas = [...respostasValidas].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });

    // Rastrear municípios já contados para evitar duplicados
    const municipiosContados = new Set<string>();
    const recordIdsValidos = new Set<string>();

    for (const resposta of ordenadas) {
      if (resposta.instituicao === 'DRS') {
        // DRS sempre entra
        recordIdsValidos.add(resposta.recordId);
      } else {
        // Para Municipio, verificar se já foi contado
        let temMunicipioNovo = false;
        for (const mun of resposta.municipiosRespondidos) {
          const normalizado = normalizeNome(mun);
          if (!municipiosContados.has(normalizado)) {
            municipiosContados.add(normalizado);
            temMunicipioNovo = true;
          }
        }
        if (temMunicipioNovo) {
          recordIdsValidos.add(resposta.recordId);
        }
      }
    }

    // Filtrar dados brutos pelos recordIds válidos
    let resultado = dadosBrutos.filter(row => recordIdsValidos.has(row['Record ID']));

    // Aplicar filtros de localização se existirem
    if (selectedRRAS || selectedDRS || selectedMunicipio) {
      const recordIdsFiltrados = new Set(respostasFiltradas.map(r => r.recordId));
      resultado = resultado.filter(row => recordIdsFiltrados.has(row['Record ID']));
    }

    return resultado;
  })();

  const totalRespostas = dadosBrutosFiltrados.length;
  
  // Contar municípios e DRS separadamente
  const totalMunicipios = dadosBrutosFiltrados.filter(row => 
    row['Instituição do respondente'] === 'Municipio'
  ).length;
  const totalDRS = dadosBrutosFiltrados.filter(row => 
    row['Instituição do respondente'] === 'DRS'
  ).length;

  // Função para analisar pergunta de seleção única (apenas municípios)
  const analisarPergunta = (coluna: string, opcoes: {label: string, match: string}[]): ResultadoAnalise[] => {
    const contagem: Record<string, number> = {};
    let naoRespondido = 0;
    let totalMunicipiosAnalisados = 0;
    
    dadosBrutosFiltrados.forEach(row => {
      const instituicao = row['Instituição do respondente'];
      // Só analisa municípios (DRS não tem essas perguntas)
      if (instituicao !== 'Municipio') return;
      
      totalMunicipiosAnalisados++;
      const valor = row[coluna];
      
      if (valor && valor.trim()) {
        contagem[valor] = (contagem[valor] || 0) + 1;
      } else {
        naoRespondido++;
      }
    });

    const resultado = opcoes.map(opcao => {
      const chaveEncontrada = Object.keys(contagem).find(k => 
        k.toLowerCase().includes(opcao.match.toLowerCase())
      );
      const quantidade = chaveEncontrada ? contagem[chaveEncontrada] : 0;
      const percentual = totalMunicipiosAnalisados > 0 ? (quantidade / totalMunicipiosAnalisados) * 100 : 0;
      return { label: opcao.label, quantidade, percentual };
    });
    
    // Adicionar "Não respondido" se houver respostas em branco
    if (naoRespondido > 0) {
      const percentual = totalMunicipiosAnalisados > 0 ? (naoRespondido / totalMunicipiosAnalisados) * 100 : 0;
      resultado.push({ label: 'Não respondido', quantidade: naoRespondido, percentual });
    }
    
    return resultado;
  };

  // Função para analisar pergunta de múltipla escolha (Checked/Unchecked) - apenas municípios
  const analisarCheckbox = (colunas: {coluna: string, label: string}[]): ResultadoAnalise[] => {
    // Contar apenas municípios
    const dadosMunicipios = dadosBrutosFiltrados.filter(row => 
      row['Instituição do respondente'] === 'Municipio'
    );
    const totalMunicipiosAnalisados = dadosMunicipios.length;
    
    return colunas.map(({ coluna, label }) => {
      let quantidade = 0;
      dadosMunicipios.forEach(row => {
        if (row[coluna] === 'Checked') quantidade++;
      });
      const percentual = totalMunicipiosAnalisados > 0 ? (quantidade / totalMunicipiosAnalisados) * 100 : 0;
      return { label, quantidade, percentual };
    });
  };

  // Função para analisar pergunta numérica - retorna distribuição por faixas
  const analisarNumerico = (coluna: string): ResultadoAnalise[] => {
    const faixas = {
      '0': 0,
      '1-2': 0,
      '3-5': 0,
      '6-10': 0,
      '11-20': 0,
      '21+': 0,
      'Não informado': 0
    };
    let totalMunicipiosAnalisados = 0;
    
    dadosBrutosFiltrados.forEach(row => {
      if (row['Instituição do respondente'] !== 'Municipio') return;
      totalMunicipiosAnalisados++;
      
      const valor = row[coluna];
      if (!valor || !valor.trim()) {
        faixas['Não informado']++;
        return;
      }
      
      const num = parseInt(valor);
      if (isNaN(num)) {
        faixas['Não informado']++;
      } else if (num === 0) {
        faixas['0']++;
      } else if (num <= 2) {
        faixas['1-2']++;
      } else if (num <= 5) {
        faixas['3-5']++;
      } else if (num <= 10) {
        faixas['6-10']++;
      } else if (num <= 20) {
        faixas['11-20']++;
      } else {
        faixas['21+']++;
      }
    });
    
    return Object.entries(faixas).map(([label, quantidade]) => ({
      label,
      quantidade,
      percentual: totalMunicipiosAnalisados > 0 ? (quantidade / totalMunicipiosAnalisados) * 100 : 0
    })).filter(item => item.quantidade > 0);
  };

  // Análises do Bloco RRAS
  const analisePapelRRAS = analisarPergunta(
    PERGUNTAS_BLOCO_RRAS[0].coluna!,
    PERGUNTAS_BLOCO_RRAS[0].opcoes!
  );

  const analiseRecebeEletivas = analisarPergunta(
    PERGUNTAS_BLOCO_RRAS[1].coluna!,
    PERGUNTAS_BLOCO_RRAS[1].opcoes!
  );

  const analiseRecebeUrgencias = analisarPergunta(
    PERGUNTAS_BLOCO_RRAS[2].coluna!,
    PERGUNTAS_BLOCO_RRAS[2].opcoes!
  );

  const analiseDestinoEncaminhamento = analisarPergunta(
    PERGUNTAS_BLOCO_RRAS[3].coluna!,
    PERGUNTAS_BLOCO_RRAS[3].opcoes!
  );

  const analiseOfertaServicos = analisarCheckbox(
    PERGUNTAS_BLOCO_RRAS[4].colunas!
  );

  // Análises do Bloco Estrutura da Regulação
  const analiseEstruturaFormal = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[0].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[0].opcoes!
  );

  const analiseServicosRegulados = analisarCheckbox(
    PERGUNTAS_BLOCO_ESTRUTURA[1].colunas!
  );

  const analiseGestaoOferta = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[2].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[2].opcoes!
  );

  const analiseEquipeRegulacao = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[3].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[3].opcoes!
  );

  const analiseMedicoRegulador = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[4].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[4].opcoes!
  );

  const analiseOutroProfissional = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[5].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[5].opcoes!
  );

  const analiseRecursosTecnicos = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[6].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[6].opcoes!
  );

  const analiseMecanismoRemoto = analisarCheckbox(
    PERGUNTAS_BLOCO_ESTRUTURA[7].colunas!
  );

  const analiseTransporteSanitario = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[8].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[8].opcoes!
  );

  const analisePreHospitalar = analisarCheckbox(
    PERGUNTAS_BLOCO_ESTRUTURA[9].colunas!
  );

  const analiseSistemasRegulacao = analisarCheckbox(
    PERGUNTAS_BLOCO_ESTRUTURA[10].colunas!
  );

  const analiseIntegracaoSistemas = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[11].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[11].opcoes!
  );

  const analiseIARegulacao = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[12].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[12].opcoes!
  );

  const analiseQtdProfissionais = analisarNumerico(
    PERGUNTAS_BLOCO_ESTRUTURA[13].coluna!
  );

  const analiseOfertaApoioRemoto = analisarPergunta(
    PERGUNTAS_BLOCO_ESTRUTURA[14].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA[14].opcoes!
  );

// Componente compacto para exibir uma pergunta
  const PerguntaCompacta = ({ 
    titulo, 
    dados, 
    corIndex = 0 
  }: { 
    titulo: string; 
    dados: ResultadoAnalise[]; 
    corIndex?: number;
  }) => {
    const total = dados.reduce((acc, d) => acc + d.quantidade, 0);
    // Ordenar do maior para o menor
    const dadosOrdenados = [...dados].sort((a, b) => b.quantidade - a.quantidade);
    const maxQuantidade = Math.max(...dadosOrdenados.map(d => d.quantidade), 1);
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-700 text-sm">{titulo}</h3>
          <span className="text-xs text-slate-400">{total} resp.</span>
        </div>
        <div className="space-y-3">
          {dadosOrdenados.map((item, idx) => (
            <div key={idx} className="group">
              {/* Linha com nome completo e valores */}
              <div className="flex items-center justify-between mb-1">
                <span 
                  className="text-xs text-slate-700 cursor-help"
                  title={item.label}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs font-semibold text-slate-800">{item.quantidade}</span>
                  <span className="text-xs text-slate-400 w-10 text-right">{item.percentual.toFixed(0)}%</span>
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${(item.quantidade / maxQuantidade) * 100}%`,
                    backgroundColor: CORES_BARRAS[(corIndex + idx) % CORES_BARRAS.length],
                    minWidth: item.quantidade > 0 ? '4px' : '0'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Área Restrita</h1>
            <p className="text-slate-500 text-sm mt-1">Análise de Respostas</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
              <input
                type="text"
                value={loginUsuario}
                onChange={(e) => setLoginUsuario(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Digite seu usuário"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Digite sua senha"
              />
            </div>
            
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2 px-4 rounded-lg font-medium hover:from-teal-600 hover:to-cyan-600 transition-all"
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Análise de Respostas</h1>
            <p className="text-indigo-200 text-sm">Diagnóstico de Regulação em Saúde</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold">{totalRespostas}</p>
            <p className="text-xs text-indigo-200">{totalMunicipios} municípios + {totalDRS} DRS</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Filtros compactos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 p-3"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filtros:</span>
          </div>
          <select
            value={selectedBloco}
            onChange={(e) => setSelectedBloco(e.target.value)}
            className="px-2 py-1 border border-teal-300 bg-teal-50 rounded text-sm font-medium text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {BLOCOS.map(bloco => (
              <option key={bloco.id} value={bloco.id}>{bloco.nome}</option>
            ))}
          </select>
          <select
            value={selectedRRAS || ''}
            onChange={(e) => {
              setSelectedRRAS(e.target.value || null);
              setSelectedDRS(null);
              setSelectedMunicipio(null);
            }}
            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todas RRAS</option>
            {rrasList.map(rras => (
              <option key={rras} value={rras}>{rras}</option>
            ))}
          </select>
          <select
            value={selectedDRS || ''}
            onChange={(e) => {
              setSelectedDRS(e.target.value || null);
              setSelectedMunicipio(null);
            }}
            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todas DRS</option>
            {drsListFiltrada.map(drs => (
              <option key={drs} value={drs}>{drs}</option>
            ))}
          </select>
          <select
            value={selectedMunicipio || ''}
            onChange={(e) => setSelectedMunicipio(e.target.value || null)}
            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos municípios</option>
            {municipiosList.map(mun => (
              <option key={mun} value={mun}>{mun}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Bloco - Papel do município na RRAS */}
      {selectedBloco === 'rras' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-800">Papel do município na RRAS</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalMunicipios} municípios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="Papel na organização da RRAS"
              dados={analisePapelRRAS}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Recebe pacientes para consultas eletivas"
              dados={analiseRecebeEletivas}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Recebe pacientes para urgências"
              dados={analiseRecebeUrgencias}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Destino mais frequente de encaminhamentos"
              dados={analiseDestinoEncaminhamento}
              corIndex={3}
            />
            <div className="md:col-span-2">
              <PerguntaCompacta 
                titulo="Oferta própria de serviços especializados"
                dados={analiseOfertaServicos}
                corIndex={4}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Bloco - Estrutura da Regulação */}
      {selectedBloco === 'estrutura' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-800">Estrutura da Regulação</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalMunicipios} municípios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="Estrutura formal de regulação"
              dados={analiseEstruturaFormal}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Serviços regulados pelo município"
              dados={analiseServicosRegulados}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Gestão exclusiva para própria população"
              dados={analiseGestaoOferta}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Equipe dedicada à regulação"
              dados={analiseEquipeRegulacao}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Possui médico regulador"
              dados={analiseMedicoRegulador}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Outro profissional de nível superior"
              dados={analiseOutroProfissional}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Recursos humanos e técnicos suficientes"
              dados={analiseRecursosTecnicos}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Mecanismos remotos de apoio"
              dados={analiseMecanismoRemoto}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Transporte sanitário integrado"
              dados={analiseTransporteSanitario}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Atendimento pré-hospitalar móvel"
              dados={analisePreHospitalar}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Sistemas utilizados para regulação"
              dados={analiseSistemasRegulacao}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Integração com outros sistemas"
              dados={analiseIntegracaoSistemas}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="IA/Algoritmos para gestão de fila"
              dados={analiseIARegulacao}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Quantidade de profissionais na regulação"
              dados={analiseQtdProfissionais}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Quem oferta o serviço de apoio remoto"
              dados={analiseOfertaApoioRemoto}
              corIndex={2}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
