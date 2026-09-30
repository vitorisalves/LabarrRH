function parseBRDate(value?: string): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function parseISODate(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface JanelaAtiva {
  inicio: Date;
  fim: Date;
  totalDias: number;
}

export function getDiasAtivosNoMes(
  admissao: string,
  desligamento: string | undefined,
  mesAno: string
): JanelaAtiva {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const admissaoDate = parseBRDate(admissao);
  const desligamentoDate = parseBRDate(desligamento);

  const inicio = admissaoDate && admissaoDate > inicioMes ? admissaoDate : inicioMes;
  const fim = desligamentoDate && desligamentoDate < fimMes ? desligamentoDate : fimMes;

  if (inicio > fim) {
    return { inicio, fim, totalDias: 0 };
  }

  const totalDias = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
  return { inicio, fim, totalDias };
}

/**
 * Itera os dias da janela ativa, recortados pelo mês e excluindo o período de férias
 * (se houver), contando quantos satisfazem o predicado.
 */
function contarDias(
  janela: JanelaAtiva,
  mesAno: string,
  feriasInicio: string | undefined,
  feriasFim: string | undefined,
  incluir: (data: Date, weekday: number) => boolean
): number {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const inicio = janela.inicio < inicioMes ? inicioMes : janela.inicio;
  const fim = janela.fim > fimMes ? fimMes : janela.fim;

  const feriasInicioDate = parseISODate(feriasInicio);
  const feriasFimDate = parseISODate(feriasFim);

  let count = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (feriasInicioDate && feriasFimDate && d >= feriasInicioDate && d <= feriasFimDate) continue;
    if (incluir(d, d.getDay())) count++;
  }
  return count;
}

/**
 * Dias de vale no mês: por padrão, todo dia ativo (7/7) gera vale. Dias da semana
 * marcados como folga fixa (diasSemanaFolga) descontam, assim como datas específicas
 * marcadas como folga extra (folgasExtras, ex: dia rotativo da escala da loja); dias em
 * férias sempre descontam; domingo nunca gera vale quando excluirDomingos (Parkshopping),
 * independente de folga.
 */
export function calcularDiasVale(params: {
  janela: JanelaAtiva;
  mesAno: string;
  diasSemanaFolga?: number[];
  folgasExtras?: string[];
  excluirDomingos?: boolean;
  feriasInicio?: string;
  feriasFim?: string;
}): number {
  const { janela, mesAno, diasSemanaFolga, folgasExtras, excluirDomingos, feriasInicio, feriasFim } = params;
  const folgaSet = new Set(diasSemanaFolga || []);
  const folgaExtraSet = new Set(folgasExtras || []);

  return contarDias(janela, mesAno, feriasInicio, feriasFim, (data, weekday) => {
    if (folgaSet.has(weekday)) return false;
    if (folgaExtraSet.has(formatISODate(data))) return false;
    if (excluirDomingos && weekday === 0) return false;
    return true;
  });
}

export interface ValeAjuste {
  diasSemanaFolga?: number[];
  folgasExtras?: string[];
  feriasInicio?: string;
  feriasFim?: string;
}

export interface ValeResultado {
  diasVA: number;
  valorVA: number;
  totalVA: number;
  diasVT: number;
  valorVT: number;
  totalVT: number;
}

export function calcularValeFuncionario(
  employee: { admissao: string; desligamento?: string; valorVT?: number },
  unidade: '710_711' | 'parkshopping',
  mesAno: string,
  valorVA: number,
  ajuste?: ValeAjuste
): ValeResultado {
  const janela = getDiasAtivosNoMes(employee.admissao, employee.desligamento, mesAno);

  const diasVA = calcularDiasVale({
    janela,
    mesAno,
    diasSemanaFolga: ajuste?.diasSemanaFolga,
    folgasExtras: ajuste?.folgasExtras,
    excluirDomingos: unidade === 'parkshopping',
    feriasInicio: ajuste?.feriasInicio,
    feriasFim: ajuste?.feriasFim,
  });

  const diasVT = calcularDiasVale({
    janela,
    mesAno,
    diasSemanaFolga: ajuste?.diasSemanaFolga,
    folgasExtras: ajuste?.folgasExtras,
    excluirDomingos: false,
    feriasInicio: ajuste?.feriasInicio,
    feriasFim: ajuste?.feriasFim,
  });

  const vt = employee.valorVT || 0;
  return {
    diasVA,
    valorVA,
    totalVA: diasVA * valorVA,
    diasVT,
    valorVT: vt,
    totalVT: diasVT * vt,
  };
}
