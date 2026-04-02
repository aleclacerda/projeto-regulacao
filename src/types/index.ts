export interface Municipio {
  codigo: string;
  nome: string;
  uf: string;
  rras: string;
  drs: string;
  regiaoSaude: string;
  populacao?: number;
  coberturaAPS?: string;
}

export interface Resposta {
  recordId: string;
  timestamp: string;
  nomeRespondente: string;
  cargo: string;
  tempoAtuacao: string;
  email: string;
  telefone: string;
  instituicao: string;
  drs: string;
  municipiosRespondidos: string[];
  regioesSaudeRespondidas: string[];
  complete: boolean;
  respostas: Record<string, string>;
}

export interface KPIData {
  totalMunicipios: number;
  municipiosRespondidos: number;
  percentualRespondido: number;
  totalDRS: number;
  drsCompletas: number;
  percentualDRS: number;
  totalRRAS: number;
  rrasCobertas: number;
  percentualRRAS: number;
  totalRegioesSaude: number;
  regioesSaudeRespondidas: number;
  percentualRegioesSaude: number;
  questionariosCompletos: number;
  totalQuestionarios: number;
  percentualQuestionarios: number;
}

export interface FilterState {
  rras: string | null;
  drs: string | null;
  municipio: string | null;
}

export interface MunicipioDuplicado {
  municipio: string;
  respostas: {
    recordId: string;
    timestamp: string;
    nomeRespondente: string;
    instituicao: string;
    email: string;
    cargo: string;
  }[];
}
