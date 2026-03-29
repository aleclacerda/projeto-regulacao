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

// Lista de blocos disponíveis por instituição
const BLOCOS_MUNICIPIO = [
  { id: 'rras', nome: 'Papel do município na RRAS' },
  { id: 'estrutura', nome: 'Estrutura da Regulação' },
  { id: 'ordenacao', nome: 'Ordenação da Demanda' },
  { id: 'priorizacao', nome: 'Priorização Clínica' }
];

const BLOCOS_DRS = [
  { id: 'estrutura_drs', nome: 'Estrutura e Sistemas do DRS' },
  { id: 'ordenacao_drs', nome: 'Ordenação da Demanda (DRS)' }
];

// Definição das perguntas do Bloco - Ordenação da Demanda (DRS)
const PERGUNTAS_BLOCO_ORDENACAO_DRS = [
  {
    id: 'diretrizes_regionais',
    coluna: 'Existem diretrizes regionais para ordenação da demanda para atenção especializada?',
    titulo: 'Diretrizes regionais para ordenação da demanda',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, formalmente pactuadas', match: 'Sim, existem diretrizes regionais formalmente pactuadas e implementadas pelos municípios da região' },
      { label: 'Sim, implementação parcial', match: 'Sim, existem diretrizes regionais pactuadas, porém com implementação parcial entre os municípios' },
      { label: 'Existem orientações não formalizadas', match: 'Existem orientações ou fluxos definidos regionalmente, mas não formalizados em instrumentos oficiais' },
      { label: 'Definidas apenas pelos municípios', match: 'As diretrizes para ordenação da demanda são definidas apenas pelos municípios, sem pactuação regional' },
      { label: 'Não existem diretrizes', match: 'Não existem diretrizes regionais para ordenação da demanda para atenção especializada' }
    ]
  },
  {
    id: 'fluxos_drs',
    coluna: 'O DRS participa da definição de fluxos assistenciais regionais?',
    titulo: 'DRS participa da definição de fluxos',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, ativamente', match: 'Sim, ativamente' },
      { label: 'Sim, pontualmente', match: 'Sim, pontualmente' },
      { label: 'Não participa', match: 'Não participa' }
    ]
  },
  {
    id: 'espacos_governanca',
    titulo: 'Espaços de governança para fluxos regionais',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=CIR)', label: 'CIR' },
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=Câmara Técnica de Regulação)', label: 'Câmara Técnica de Regulação' },
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=Grupo Regional de regulação)', label: 'Grupo Regional de regulação' },
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=Comitê Regional de Acesso)', label: 'Comitê Regional de Acesso' },
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=Não existem espaços específicos)', label: 'Não existem espaços específicos' },
      { coluna: 'Existem espaços formais de governança da regulação do acesso na região ? (choice=Outros)', label: 'Outros' }
    ]
  },
  {
    id: 'fluxos_formalizados',
    coluna: 'Existem fluxos regionais formalizados para acesso especializado?',
    titulo: 'Fluxos regionais formalizados',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Maioria dos serviços', match: 'Maioria dos serviços' },
      { label: 'Alguns serviços', match: 'Alguns serviços' },
      { label: 'Não existem', match: 'Não existem' }
    ]
  },
  {
    id: 'articulacao_aps',
    coluna: 'Como ocorre a articulação da Atenção Primária à Saúde (APS) com os processos de regulação da atenção especializada na região?',
    titulo: 'Articulação APS com regulação especializada',
    tipo: 'dropdown',
    opcoes: [
      { label: 'APS atua como ordenadora', match: 'A APS atua como ordenadora do acesso com protocolos definidos' },
      { label: 'APS participa parcialmente', match: 'A APS participa parcialmente do processo regulatório' },
      { label: 'APS encaminha diretamente', match: 'A APS encaminha diretamente para serviços especializados sem mediação regional' },
      { label: 'Não há articulação estruturada', match: 'Não há articulação estruturada entre APS e regulação' }
    ]
  },
  {
    id: 'solicitacoes_municipais',
    coluna: 'Como as solicitações municipais de acesso à atenção especializada são organizadas na região ?',
    titulo: 'Organização das solicitações municipais',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Inserção direta no SIRESP', match: 'Inserção direta no SIRESP' },
      { label: 'Inserção via central municipal', match: 'Inserção via central municipal' },
      { label: 'Inserção via central regional', match: 'Inserção via central regional' },
      { label: 'Modelo misto', match: 'Modelo misto' },
      { label: 'Outro', match: 'Outro' }
    ]
  },
  {
    id: 'regulacao_internacoes',
    coluna: 'Como ocorre a regulação das internações hospitalares de urgência ?',
    titulo: 'Regulação de internações de urgência',
    tipo: 'dropdown',
    opcoes: [
      { label: 'SIRESP', match: 'SIRESP' },
      { label: 'Regulação regional', match: 'Regulação regional' },
      { label: 'Regulação hospitalar direta', match: 'Regulação hospitalar direta' },
      { label: 'Modelo misto', match: 'Modelo misto' }
    ]
  },
  {
    id: 'protocolo_vaga_zero',
    coluna: 'Existe protocolo regional para utilização da vaga zero?',
    titulo: 'Protocolo regional para vaga zero',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, formalizado', match: 'Sim, formalizado' },
      { label: 'Sim, sem formalização', match: 'Sim, utilizado na prática, mas sem formalização' },
      { label: 'Não existe protocolo', match: 'Não existe protocolo' }
    ]
  },
  {
    id: 'papel_drs_ambulatorial',
    coluna: 'Quando há dificuldade de acesso à atenção ambulatorial especializada qual é o papel do DRS?',
    titulo: 'Papel do DRS na dificuldade ambulatorial',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Atua diretamente', match: 'Atua diretamente' },
      { label: 'Media municípios', match: 'Media municípios' },
      { label: 'Apenas acompanha', match: 'Apenas acompanha' },
      { label: 'Não atua', match: 'Não atua' }
    ]
  },
  {
    id: 'papel_drs_hospitalar',
    coluna: 'Quando há dificuldade de acesso à atenção hospitalar qual é o papel do DRS?',
    titulo: 'Papel do DRS na dificuldade hospitalar',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Atua diretamente', match: 'Atua diretamente' },
      { label: 'Media municípios', match: 'Media municípios' },
      { label: 'Apenas acompanha', match: 'Apenas acompanha' },
      { label: 'Não atua', match: 'Não atua' }
    ]
  }
];

// Definição das perguntas do Bloco - Estrutura e Sistemas do DRS
const PERGUNTAS_BLOCO_ESTRUTURA_DRS = [
  {
    id: 'sistemas_drs',
    titulo: 'Sistemas de regulação utilizados no DRS',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Quais sistemas de regulação são utilizados no DRS? (choice=SIRESP)', label: 'SIRESP' },
      { coluna: 'Quais sistemas de regulação são utilizados no DRS? (choice=Sistema regional próprio)', label: 'Sistema regional próprio' },
      { coluna: 'Quais sistemas de regulação são utilizados no DRS? (choice=Sistemas municipal e estadual integrados)', label: 'Sistemas integrados' },
      { coluna: 'Quais sistemas de regulação são utilizados no DRS? (choice=Planilhas ou registros manuais)', label: 'Planilhas/registros manuais' },
      { coluna: 'Quais sistemas de regulação são utilizados no DRS? (choice=Outros)', label: 'Outros' }
    ]
  },
  {
    id: 'acesso_siresp',
    coluna: 'O DRS possui acesso ao SIRESP ?',
    titulo: 'Acesso ao SIRESP',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Acesso completo', match: 'Acesso completo' },
      { label: 'Acesso parcial', match: 'Acesso parcial' },
      { label: 'Não possui', match: 'Não possui' }
    ]
  },
  {
    id: 'integracao_sistemas_drs',
    coluna: 'Qual o formato de integração ente o sistema municipal e estadual?',
    titulo: 'Formato de integração de sistemas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Totalmente integrados', match: 'Totalmente integrados' },
      { label: 'Parcialmente integrados', match: 'Parcialmente integrados' },
      { label: 'Não integrados', match: 'Não integrados' }
    ]
  }
];

// Definição das perguntas do Bloco - Ordenação da Demanda
const PERGUNTAS_BLOCO_ORDENACAO = [
  {
    id: 'fila_ubs',
    coluna: 'As equipes das UBS inserem todas as solicitações para agendamento de consultas e exames em fila de espera eletrônica?',
    titulo: 'UBS inserem solicitações em fila eletrônica',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sempre', match: 'Sempre' },
      { label: 'Na maioria dos casos', match: 'Na maioria do casos' },
      { label: 'Apenas para alguns serviços', match: 'Apenas para alguns serviços' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'sistema_ubs',
    titulo: 'Sistema utilizado nas UBS para solicitação',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Qual o sistema utilizado nas UBS para solicitação da vaga ? (choice=SISREG)', label: 'SISREG' },
      { coluna: 'Qual o sistema utilizado nas UBS para solicitação da vaga ? (choice=SIRESP)', label: 'SIRESP' },
      { coluna: 'Qual o sistema utilizado nas UBS para solicitação da vaga ? (choice=E-SUS Regulação)', label: 'E-SUS Regulação' },
      { coluna: 'Qual o sistema utilizado nas UBS para solicitação da vaga ? (choice=Sistema próprio)', label: 'Sistema próprio' },
      { coluna: 'Qual o sistema utilizado nas UBS para solicitação da vaga ? (choice=Outro)', label: 'Outro' }
    ]
  },
  {
    id: 'protocolos_municipais',
    coluna: 'As equipes das UBS  utilizam os protocolos municipais de regulação para encaminhamento de pacientes na rede de saúde?',
    titulo: 'UBS utilizam protocolos municipais',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Utilizam regularmente', match: 'Utilizam regularmente' },
      { label: 'Utilizam pouco', match: 'Utilizam pouco' },
      { label: 'Não utilizam', match: 'Não utilizam' }
    ]
  },
  {
    id: 'protocolos_regionais',
    coluna: 'As equipes das UBS  utilizam os protocolos regionais de regulação para encaminhamento de pacientes na rede de saúde?',
    titulo: 'UBS utilizam protocolos regionais',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Utilizam regularmente', match: 'Utilizam regularmente' },
      { label: 'Utilizam pouco', match: 'Utilizam pouco' },
      { label: 'Não utilizam', match: 'Não utilizam' }
    ]
  },
  {
    id: 'exames_complexidade',
    coluna: 'As equipes das UBS podem solicitar diretamente exames de maior complexidade (por exemplo: tomografia, ressonância magnética, ecocardiograma, endoscopia ou colonoscopia) ou é necessário encaminhamento prévio para atenção especializada?',
    titulo: 'UBS solicitam exames de maior complexidade',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Solicita conforme protocolos', match: 'A equipe de UBS pode solicitar diretamente, conforme protocolos definidos' },
      { label: 'Solicita apenas alguns exames', match: 'A equipe da UBS pode solicitar diretamente apenas alguns exames' },
      { label: 'Necessário encaminhamento prévio', match: 'É necessário encaminhamento prévio para atenção especializada' }
    ]
  },
  {
    id: 'acompanhamento_ubs',
    coluna: 'As equipes das UBS acompanham o andamento da solicitação  após a inserção  no sistema de regulação?',
    titulo: 'UBS acompanham andamento da solicitação',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Tem acesso e acompanha', match: 'A equipe tem acesso ao sistema e  acompanha' },
      { label: 'Tem acesso mas não acompanha', match: 'A equipe tem acesso ao sistema e não acompanha' },
      { label: 'Não tem acesso ao sistema', match: 'A equipe não tem acesso ao sistema' },
      { label: 'Sistema não permite', match: 'O sistema de regulação não permite que a equipe acompanhe' }
    ]
  },
  {
    id: 'contrarreferencia',
    coluna: 'Existe fluxo de contrarreferência entre os serviços de atenção hospitalar e a APS ?',
    titulo: 'Fluxo de contrarreferência hospitalar-APS',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sempre', match: 'Sempre' },
      { label: 'Na maioria dos casos', match: 'Na maioria do casos' },
      { label: 'Apenas para alguns serviços', match: 'Apenas para alguns serviços' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'oferta_aae',
    coluna: 'O município possui oferta de Atenção Ambulatorial Especializada (AAE) ?',
    titulo: 'Possui oferta de AAE',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'sistema_aae',
    coluna: 'Qual o sistema utilizado na AAE para solicitação de vaga ?',
    titulo: 'Sistema utilizado na AAE',
    tipo: 'dropdown',
    opcoes: [
      { label: 'SISREG', match: 'SISREG' },
      { label: 'SIRESP', match: 'SIRESP' },
      { label: 'E-SUS Regulação', match: 'E-SUS Regulação' },
      { label: 'Sistema próprio', match: 'Sistema próprio' }
    ]
  },
  {
    id: 'solicitacoes_hospitalar',
    coluna: 'As solicitações de vaga hospitalar são registradas em sistema regulatório?',
    titulo: 'Solicitações hospitalares em sistema',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Parcialmente', match: 'Parcialmente' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'comunicacao_samu',
    coluna: 'Há comunicação formal entre SAMU e Central de Internações?',
    titulo: 'Comunicação SAMU e Central de Internações',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Exclusivamente via regulação', match: 'Exclusivamente via regulação (CROSS ou central municipal)' },
      { label: 'Preferencialmente via regulação', match: 'Preferencialmente via regulação' },
      { label: 'Diretamente entre hospitais', match: 'Diretamente entre hospitais' }
    ]
  },
  {
    id: 'transferencia_hospitalar',
    coluna: 'Como ocorre a solicitação de transferência hospitalar no município?',
    titulo: 'Solicitação de transferência hospitalar',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Via central de regulação', match: 'Via central de regulação' },
      { label: 'Via CROSS', match: 'Via CROSS' },
      { label: 'Diretamente entre serviços', match: 'Diretamente entre serviços' },
      { label: 'Outro', match: 'Outro' }
    ]
  },
  {
    id: 'classificacao_risco',
    coluna: 'A classificação de risco é utilizada nos serviços de urgência do município?',
    titulo: 'Classificação de risco nas urgências',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'vaga_zero',
    coluna: 'O município utiliza o dispositivo de vaga zero em situações de urgência?',
    titulo: 'Utiliza vaga zero em urgências',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'transferencia_urgencia',
    coluna: 'Quando há necessidade de transferência de paciente em situação de urgência, como ocorre a regulação?',
    titulo: 'Regulação de transferência em urgência',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Via central de regulação', match: 'Via central de regulação' },
      { label: 'Via CROSS', match: 'Via CROSS' },
      { label: 'Diretamente entre serviços', match: 'Diretamente entre serviços' }
    ]
  },
  {
    id: 'acompanhamento_sistema',
    coluna: 'O sistema de regulação permite acompanhar o andamento das solicitações inseridas para consultas ou exames especializados?',
    titulo: 'Sistema permite acompanhar solicitações',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, atualização em tempo real', match: 'Sim, atualização em tempo real' },
      { label: 'Sim, atualização limitada', match: 'Sim, mas com atualização limitada' },
      { label: 'Não permite acompanhamento', match: 'Não permite acompanhamento estruturado' }
    ]
  },
  {
    id: 'solicitacoes_duplicadas',
    coluna: 'O sistema de regulação possui mecanismos para identificar solicitações duplicadas para o mesmo paciente e procedimento?',
    titulo: 'Identificação de solicitações duplicadas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, bloqueio automático', match: 'Sim, bloqueio automático' },
      { label: 'Sim, identificação posterior', match: 'Sim, permite identificação posterior' },
      { label: 'Não possui mecanismos', match: 'Não possui mecanismos de controle' }
    ]
  }
];

// Definição das perguntas do Bloco - Priorização Clínica
const PERGUNTAS_BLOCO_PRIORIZACAO = [
  {
    id: 'protocolos_acesso',
    coluna: 'Existem  protocolos de acesso  formalizados para as principais linhas de cuidado priorizadas na região?',
    titulo: 'Protocolos de acesso formalizados',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'criterios_priorizacao',
    coluna: 'Existem critérios de priorização baseados em protocolos e utilizados pela regulação para priorizar a lista de espera?',
    titulo: 'Critérios de priorização baseados em protocolos',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'quais_criterios',
    titulo: 'Critérios utilizados para priorização',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Gravidade clínica)', label: 'Gravidade clínica' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Risco de agravamento)', label: 'Risco de agravamento' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Tempo de espera)', label: 'Tempo de espera' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Vulnerabilidade social)', label: 'Vulnerabilidade social' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Idade)', label: 'Idade' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Condição funcional)', label: 'Condição funcional' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Outros)', label: 'Outros' },
      { coluna: 'Quais critérios são utilizados para priorização?  (choice=Não existe critérios definidos)', label: 'Não existe critérios definidos' }
    ]
  },
  {
    id: 'apoio_matricial',
    coluna: 'Existe apoio matricial presencial ou remoto entre a atenção especializada e APS para qualificação dos encaminhamentos',
    titulo: 'Apoio matricial para qualificação',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, sistematicamente', match: 'Sim, sistematicamente' },
      { label: 'Sim, ocasionalmente', match: 'Sim, ocasionalmente' },
      { label: 'Não existe', match: 'Não existe' }
    ]
  },
  {
    id: 'devolucao_demanda',
    coluna: 'Quando uma solicitação é considerada inadequada no processo de regulação, existe devolução da demanda para equipe da UBS com orientação para qualificação dos encaminhamentos?',
    titulo: 'Devolução de solicitação inadequada',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, com orientação clínica', match: 'Sim, com orientação clínica específica' },
      { label: 'Sim, por questões administrativas', match: 'Sim, mas somente por questões administrativas' },
      { label: 'Não é realizada devolução', match: 'Não é realizada devolução da solicitação' }
    ]
  },
  {
    id: 'protocolos_avaliacao',
    coluna: 'Na prática, os protocolos são utilizados na avaliação das solicitações?',
    titulo: 'Protocolos utilizados na avaliação',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sempre', match: 'Sempre' },
      { label: 'Na maioria das vezes', match: 'Na maioria das vezes' },
      { label: 'Ocasionalmente', match: 'Ocasionalmente' },
      { label: 'Raramente', match: 'Raramente' },
      { label: 'Não são utilizados', match: 'Não são utilizados' }
    ]
  },
  {
    id: 'criterio_agendamento',
    coluna: 'Qual é o principal critério utilizado para definir o local de agendamento das consultas ou exames especializados?',
    titulo: 'Critério para local de agendamento',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Prioriza vaga disponível', match: 'Prioriza o primeiro serviço com vaga disponível' },
      { label: 'Prioriza proximidade', match: 'Prioriza serviços mais próximos da residência do paciente' },
      { label: 'Combinação proximidade e vaga', match: 'Utiliza combinação de proximidade geográfica e disponibilidade de vagas' },
      { label: 'Depende da especialidade', match: 'Depende da especialidade ou do serviço' }
    ]
  },
  {
    id: 'fluxos_formalizados_linhas',
    coluna: 'Os fluxos de referência e contrarreferência estão formalizados para as principais linhas de cuidado priorizadas na região?',
    titulo: 'Fluxos formalizados para linhas de cuidado',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'fluxos_samu',
    coluna: 'Há fluxos pactuados para urgência pré-hospitalar (SAMU)?',
    titulo: 'Fluxos pactuados para SAMU',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'fluxos_interhospitalar',
    coluna: 'Há fluxos pactuados para urgência inter-hospitalar?',
    titulo: 'Fluxos pactuados inter-hospitalar',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'fluxos_eletivas',
    coluna: 'Há fluxos pactuados para internações eletivas?',
    titulo: 'Fluxos pactuados para internações eletivas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'fluxos_consultas',
    coluna: 'Há fluxos pactuados para consultas especializadas e exames?',
    titulo: 'Fluxos pactuados para consultas/exames',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'niveis_prioridade',
    coluna: 'As solicitações são classificadas em níveis de prioridade clínica?',
    titulo: 'Classificação em níveis de prioridade',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, classificação formal', match: 'Sim - classificação formal (urgente, prioritário, eletivo)' },
      { label: 'Sim, classificação informal', match: 'Sim - classificação informal' },
      { label: 'Não há classificação', match: 'Não há classificação' }
    ]
  },
  {
    id: 'quem_classifica',
    titulo: 'Quem realiza a classificação de prioridade',
    tipo: 'checkbox',
    colunas: [
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Profissional da UBS)', label: 'Profissional da UBS' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Profissional da eMulti)', label: 'Profissional da eMulti' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Médico regulador)', label: 'Médico regulador' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Equipe da Central de Regulação)', label: 'Equipe da Central de Regulação' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Serviço solicitante)', label: 'Serviço solicitante' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Serviço executantes)', label: 'Serviço executante' },
      { coluna: 'Quem realiza a classificação de prioridade das solicitações? (choice=Outro)', label: 'Outro' }
    ]
  },
  {
    id: 'monitoramento_filas',
    coluna: 'O município realiza monitoramento sistemático das filas de espera?',
    titulo: 'Monitoramento sistemático das filas',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim, com relatórios periódicos', match: 'Sim- com relatórios periódicos' },
      { label: 'Sim, apenas pontualmente', match: 'Sim, apenas pontualmente' },
      { label: 'Não realiza monitoramento', match: 'Não realiza monitoramento' }
    ]
  },
  {
    id: 'tempos_maximos',
    coluna: 'Existem tempos máximos pactuados para atendimento por tipo de prioridade?',
    titulo: 'Tempos máximos pactuados',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'tempo_espera',
    coluna: 'Qual é o tempo médio de espera para acesso aos principais serviços especializados no território?',
    titulo: 'Tempo médio de espera',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Até 30 dias', match: 'Até 30 dias' },
      { label: '30 a 90 dias', match: '30 a 90 dias' },
      { label: '3 a 6 meses', match: '3 a 6 meses' },
      { label: 'Mais de 6 meses', match: 'Mais de 6 meses' },
      { label: 'Não há monitoramento', match: 'Não há monitoramento' }
    ]
  },
  {
    id: 'atendimentos_fora_fila',
    coluna: 'Ocorrem atendimentos fora da fila regulada?',
    titulo: 'Atendimentos fora da fila regulada',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Nunca', match: 'Nunca' },
      { label: 'Raramente', match: 'Raramente' },
      { label: 'Frequentemente', match: 'Frequentemente' },
      { label: 'Muito frequentemente', match: 'Muito frequentemente' }
    ]
  },
  {
    id: 'filas_paralelas',
    coluna: 'Existem filas paralelas fora dos sistemas de informação mantidas por unidades ou hospitais?',
    titulo: 'Filas paralelas fora do sistema',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  },
  {
    id: 'acesso_tempo_real',
    coluna: 'A equipe reguladora tem acesso em tempo real à posição dos usuários na fila de espera?',
    titulo: 'Acesso em tempo real à fila',
    tipo: 'dropdown',
    opcoes: [
      { label: 'Sim', match: 'Sim' },
      { label: 'Não', match: 'Não' }
    ]
  }
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
  const [selectedInstituicao, setSelectedInstituicao] = useState<'Municipio' | 'DRS'>('Municipio');

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

  // ========== ANÁLISES PARA DRS ==========
  // Função para analisar pergunta de DRS (seleção única)
  const analisarPerguntaDRS = (coluna: string, opcoes: {label: string, match: string}[]): ResultadoAnalise[] => {
    const contagem: Record<string, number> = {};
    let naoRespondido = 0;
    let totalDRSAnalisados = 0;
    
    dadosBrutosFiltrados.forEach(row => {
      const instituicao = row['Instituição do respondente'];
      if (instituicao !== 'DRS') return;
      
      totalDRSAnalisados++;
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
      const percentual = totalDRSAnalisados > 0 ? (quantidade / totalDRSAnalisados) * 100 : 0;
      return { label: opcao.label, quantidade, percentual };
    });
    
    if (naoRespondido > 0) {
      const percentual = totalDRSAnalisados > 0 ? (naoRespondido / totalDRSAnalisados) * 100 : 0;
      resultado.push({ label: 'Não respondido', quantidade: naoRespondido, percentual });
    }
    
    return resultado;
  };

  // Função para analisar checkbox de DRS
  const analisarCheckboxDRS = (colunas: {coluna: string, label: string}[]): ResultadoAnalise[] => {
    const dadosDRS = dadosBrutosFiltrados.filter(row => 
      row['Instituição do respondente'] === 'DRS'
    );
    const totalDRSAnalisados = dadosDRS.length;
    
    return colunas.map(({ coluna, label }) => {
      let quantidade = 0;
      dadosDRS.forEach(row => {
        if (row[coluna] === 'Checked') quantidade++;
      });
      const percentual = totalDRSAnalisados > 0 ? (quantidade / totalDRSAnalisados) * 100 : 0;
      return { label, quantidade, percentual };
    });
  };

  // Análises do Bloco Estrutura DRS
  const analiseSistemasDRS = analisarCheckboxDRS(
    PERGUNTAS_BLOCO_ESTRUTURA_DRS[0].colunas!
  );

  const analiseAcessoSIRESP = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ESTRUTURA_DRS[1].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA_DRS[1].opcoes!
  );

  const analiseIntegracaoSistemasDRS = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ESTRUTURA_DRS[2].coluna!,
    PERGUNTAS_BLOCO_ESTRUTURA_DRS[2].opcoes!
  );

  // ========== ANÁLISES DO BLOCO ORDENAÇÃO DA DEMANDA (DRS) ==========
  const analiseDiretrizesRegionais = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[0].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[0].opcoes!
  );

  const analiseFluxosDRS = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[1].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[1].opcoes!
  );

  const analiseEspacosGovernanca = analisarCheckboxDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[2].colunas!
  );

  const analiseFluxosFormalizados = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[3].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[3].opcoes!
  );

  const analiseArticulacaoAPS = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[4].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[4].opcoes!
  );

  const analiseSolicitacoesMunicipais = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[5].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[5].opcoes!
  );

  const analiseRegulacaoInternacoes = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[6].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[6].opcoes!
  );

  const analiseProtocoloVagaZero = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[7].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[7].opcoes!
  );

  const analisePapelDRSAmbulatorial = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[8].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[8].opcoes!
  );

  const analisePapelDRSHospitalar = analisarPerguntaDRS(
    PERGUNTAS_BLOCO_ORDENACAO_DRS[9].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO_DRS[9].opcoes!
  );

  // ========== ANÁLISES DO BLOCO ORDENAÇÃO DA DEMANDA ==========
  const analiseFilaUBS = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[0].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[0].opcoes!
  );

  const analiseSistemaUBS = analisarCheckbox(
    PERGUNTAS_BLOCO_ORDENACAO[1].colunas!
  );

  const analiseProtocolosMunicipais = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[2].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[2].opcoes!
  );

  const analiseProtocolosRegionais = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[3].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[3].opcoes!
  );

  const analiseExamesComplexidade = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[4].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[4].opcoes!
  );

  const analiseAcompanhamentoUBS = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[5].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[5].opcoes!
  );

  const analiseContrarreferencia = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[6].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[6].opcoes!
  );

  const analiseOfertaAAE = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[7].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[7].opcoes!
  );

  const analiseSistemaAAE = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[8].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[8].opcoes!
  );

  const analiseSolicitacoesHospitalar = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[9].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[9].opcoes!
  );

  const analiseComunicacaoSAMU = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[10].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[10].opcoes!
  );

  const analiseTransferenciaHospitalar = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[11].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[11].opcoes!
  );

  const analiseClassificacaoRisco = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[12].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[12].opcoes!
  );

  const analiseVagaZero = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[13].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[13].opcoes!
  );

  const analiseTransferenciaUrgencia = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[14].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[14].opcoes!
  );

  const analiseAcompanhamentoSistema = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[15].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[15].opcoes!
  );

  const analiseSolicitacoesDuplicadas = analisarPergunta(
    PERGUNTAS_BLOCO_ORDENACAO[16].coluna!,
    PERGUNTAS_BLOCO_ORDENACAO[16].opcoes!
  );

  // ========== ANÁLISES DO BLOCO PRIORIZAÇÃO CLÍNICA ==========
  const analiseProtocolosAcesso = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[0].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[0].opcoes!
  );

  const analiseCriteriosPriorizacao = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[1].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[1].opcoes!
  );

  const analiseQuaisCriterios = analisarCheckbox(
    PERGUNTAS_BLOCO_PRIORIZACAO[2].colunas!
  );

  const analiseApoioMatricial = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[3].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[3].opcoes!
  );

  const analiseDevolucaoDemanda = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[4].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[4].opcoes!
  );

  const analiseProtocolosAvaliacao = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[5].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[5].opcoes!
  );

  const analiseCriterioAgendamento = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[6].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[6].opcoes!
  );

  const analiseFluxosLinhasCuidado = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[7].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[7].opcoes!
  );

  const analiseFluxosSAMU = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[8].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[8].opcoes!
  );

  const analiseFluxosInterhospitalar = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[9].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[9].opcoes!
  );

  const analiseFluxosEletivas = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[10].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[10].opcoes!
  );

  const analiseFluxosConsultas = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[11].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[11].opcoes!
  );

  const analiseNiveisPrioridade = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[12].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[12].opcoes!
  );

  const analiseQuemClassifica = analisarCheckbox(
    PERGUNTAS_BLOCO_PRIORIZACAO[13].colunas!
  );

  const analiseMonitoramentoFilas = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[14].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[14].opcoes!
  );

  const analiseTemposMaximos = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[15].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[15].opcoes!
  );

  const analiseTempoEspera = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[16].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[16].opcoes!
  );

  const analiseAtendimentosForaFila = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[17].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[17].opcoes!
  );

  const analiseFilasParalelas = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[18].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[18].opcoes!
  );

  const analiseAcessoTempoReal = analisarPergunta(
    PERGUNTAS_BLOCO_PRIORIZACAO[19].coluna!,
    PERGUNTAS_BLOCO_PRIORIZACAO[19].opcoes!
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
            value={selectedInstituicao}
            onChange={(e) => {
              const inst = e.target.value as 'Municipio' | 'DRS';
              setSelectedInstituicao(inst);
              setSelectedBloco(inst === 'Municipio' ? 'rras' : 'estrutura_drs');
            }}
            className="px-2 py-1 border border-purple-300 bg-purple-50 rounded text-sm font-medium text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="Municipio">Município</option>
            <option value="DRS">DRS</option>
          </select>
          <select
            value={selectedBloco}
            onChange={(e) => setSelectedBloco(e.target.value)}
            className="px-2 py-1 border border-teal-300 bg-teal-50 rounded text-sm font-medium text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {(selectedInstituicao === 'Municipio' ? BLOCOS_MUNICIPIO : BLOCOS_DRS).map(bloco => (
              <option key={bloco.id} value={bloco.id}>{bloco.nome}</option>
            ))}
          </select>
          {selectedInstituicao === 'Municipio' && (
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
          )}
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

      {/* Bloco - Ordenação da Demanda */}
      {selectedBloco === 'ordenacao' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-slate-800">Ordenação da Demanda</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalMunicipios} municípios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="UBS inserem solicitações em fila eletrônica"
              dados={analiseFilaUBS}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Sistema utilizado nas UBS"
              dados={analiseSistemaUBS}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="UBS utilizam protocolos municipais"
              dados={analiseProtocolosMunicipais}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="UBS utilizam protocolos regionais"
              dados={analiseProtocolosRegionais}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="UBS solicitam exames de maior complexidade"
              dados={analiseExamesComplexidade}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="UBS acompanham andamento da solicitação"
              dados={analiseAcompanhamentoUBS}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Fluxo de contrarreferência hospitalar-APS"
              dados={analiseContrarreferencia}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Possui oferta de AAE"
              dados={analiseOfertaAAE}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Sistema utilizado na AAE"
              dados={analiseSistemaAAE}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Solicitações hospitalares em sistema"
              dados={analiseSolicitacoesHospitalar}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Comunicação SAMU e Central de Internações"
              dados={analiseComunicacaoSAMU}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Solicitação de transferência hospitalar"
              dados={analiseTransferenciaHospitalar}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Classificação de risco nas urgências"
              dados={analiseClassificacaoRisco}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Utiliza vaga zero em urgências"
              dados={analiseVagaZero}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Regulação de transferência em urgência"
              dados={analiseTransferenciaUrgencia}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Sistema permite acompanhar solicitações"
              dados={analiseAcompanhamentoSistema}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Identificação de solicitações duplicadas"
              dados={analiseSolicitacoesDuplicadas}
              corIndex={4}
            />
          </div>
        </motion.div>
      )}

      {/* Bloco - Priorização Clínica */}
      {selectedBloco === 'priorizacao' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-rose-600" />
            <h2 className="font-semibold text-slate-800">Priorização Clínica</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalMunicipios} municípios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="Protocolos de acesso formalizados"
              dados={analiseProtocolosAcesso}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Critérios de priorização em protocolos"
              dados={analiseCriteriosPriorizacao}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Critérios utilizados para priorização"
              dados={analiseQuaisCriterios}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Apoio matricial para qualificação"
              dados={analiseApoioMatricial}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Devolução de solicitação inadequada"
              dados={analiseDevolucaoDemanda}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Protocolos utilizados na avaliação"
              dados={analiseProtocolosAvaliacao}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Critério para local de agendamento"
              dados={analiseCriterioAgendamento}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Fluxos formalizados para linhas de cuidado"
              dados={analiseFluxosLinhasCuidado}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Fluxos pactuados para SAMU"
              dados={analiseFluxosSAMU}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Fluxos pactuados inter-hospitalar"
              dados={analiseFluxosInterhospitalar}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Fluxos pactuados para internações eletivas"
              dados={analiseFluxosEletivas}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Fluxos pactuados para consultas/exames"
              dados={analiseFluxosConsultas}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Classificação em níveis de prioridade"
              dados={analiseNiveisPrioridade}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Quem realiza a classificação"
              dados={analiseQuemClassifica}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Monitoramento sistemático das filas"
              dados={analiseMonitoramentoFilas}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Tempos máximos pactuados"
              dados={analiseTemposMaximos}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Tempo médio de espera"
              dados={analiseTempoEspera}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Atendimentos fora da fila regulada"
              dados={analiseAtendimentosForaFila}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Filas paralelas fora do sistema"
              dados={analiseFilasParalelas}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Acesso em tempo real à fila"
              dados={analiseAcessoTempoReal}
              corIndex={1}
            />
          </div>
        </motion.div>
      )}

      {/* Bloco - Estrutura e Sistemas do DRS */}
      {selectedBloco === 'estrutura_drs' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-slate-800">Estrutura e Sistemas do DRS</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalDRS} DRS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="Sistemas de regulação utilizados"
              dados={analiseSistemasDRS}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Acesso ao SIRESP"
              dados={analiseAcessoSIRESP}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Formato de integração de sistemas"
              dados={analiseIntegracaoSistemasDRS}
              corIndex={2}
            />
          </div>
        </motion.div>
      )}

      {/* Bloco - Ordenação da Demanda (DRS) */}
      {selectedBloco === 'ordenacao_drs' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-slate-800">Ordenação da Demanda (DRS)</h2>
            <span className="text-xs text-slate-400 ml-auto">{totalDRS} DRS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PerguntaCompacta 
              titulo="Diretrizes regionais para ordenação"
              dados={analiseDiretrizesRegionais}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="DRS participa da definição de fluxos"
              dados={analiseFluxosDRS}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Espaços de governança regionais"
              dados={analiseEspacosGovernanca}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Fluxos regionais formalizados"
              dados={analiseFluxosFormalizados}
              corIndex={3}
            />
            <PerguntaCompacta 
              titulo="Articulação APS com regulação"
              dados={analiseArticulacaoAPS}
              corIndex={4}
            />
            <PerguntaCompacta 
              titulo="Organização das solicitações municipais"
              dados={analiseSolicitacoesMunicipais}
              corIndex={5}
            />
            <PerguntaCompacta 
              titulo="Regulação de internações de urgência"
              dados={analiseRegulacaoInternacoes}
              corIndex={0}
            />
            <PerguntaCompacta 
              titulo="Protocolo regional para vaga zero"
              dados={analiseProtocoloVagaZero}
              corIndex={1}
            />
            <PerguntaCompacta 
              titulo="Papel do DRS na dificuldade ambulatorial"
              dados={analisePapelDRSAmbulatorial}
              corIndex={2}
            />
            <PerguntaCompacta 
              titulo="Papel do DRS na dificuldade hospitalar"
              dados={analisePapelDRSHospitalar}
              corIndex={3}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
