export type UnidadeVale = '710_711' | 'parkshopping';

export interface AjusteArmazenado {
  funcionarioId: string;
  unidade: UnidadeVale;
  diasSemanaFolga?: number[]; // 0 (domingo) - 6 (sábado), persistente entre meses
  folgasExtras?: string[]; // datas 'YYYY-MM-DD' específicas, além da folga fixa (ex: dia rotativo da loja)
  feriasInicio?: string; // 'YYYY-MM-DD', persistente entre meses
  feriasFim?: string; // 'YYYY-MM-DD', persistente entre meses
}

export interface ValeCalculado {
  funcionarioId: string;
  nome: string;
  cargo?: string;
  chavePix: string;
  diasVA: number;
  valorVA: number;
  totalVA: number;
  diasVT: number;
  valorVT: number;
  totalVT: number;
}
