export type UnidadeVale = '710_711' | 'parkshopping';

export interface AjusteArmazenado {
  funcionarioId: string;
  unidade: UnidadeVale;
  mesAno: string; // 'YYYY-MM'
  folgasManuais?: number[];
  feriasInicio?: string; // 'YYYY-MM-DD'
  feriasFim?: string; // 'YYYY-MM-DD'
}

export interface ValeCalculado {
  funcionarioId: string;
  nome: string;
  cargo?: string;
  chavePix: string;
  diasVale: number;
  valorDia: number;
  valorTotal: number;
}
