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

export function removerFerias(
  janela: JanelaAtiva,
  feriasInicio: string | undefined,
  feriasFim: string | undefined,
  mesAno: string
): number {
  if (janela.totalDias === 0) return 0;

  const feriasInicioDate = parseISODate(feriasInicio);
  const feriasFimDate = parseISODate(feriasFim);
  if (!feriasInicioDate || !feriasFimDate) return janela.totalDias;

  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const inicioCorte = feriasInicioDate < inicioMes ? inicioMes : feriasInicioDate;
  const fimCorte = feriasFimDate > fimMes ? fimMes : feriasFimDate;

  const inicioSobreposicao = inicioCorte < janela.inicio ? janela.inicio : inicioCorte;
  const fimSobreposicao = fimCorte > janela.fim ? janela.fim : fimCorte;

  if (inicioSobreposicao > fimSobreposicao) {
    return janela.totalDias;
  }

  const diasFerias = Math.round((fimSobreposicao.getTime() - inicioSobreposicao.getTime()) / 86400000) + 1;
  return Math.max(0, janela.totalDias - diasFerias);
}

/**
 * Itera os dias da janela ativa, recortados pelo mês e excluindo o período de férias
 * (se houver), contando quantos satisfazem o predicado. Usado tanto para contar domingos
 * quanto folgas por dia da semana, para que férias nunca sejam descontadas duas vezes.
 */
function contarDias(
  janela: JanelaAtiva,
  mesAno: string,
  feriasInicio: string | undefined,
  feriasFim: string | undefined,
  incluir: (weekday: number) => boolean
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
    if (incluir(d.getDay())) count++;
  }
  return count;
}

export function calcularDiasVale(params: {
  diasRestantes: number;
  janela: JanelaAtiva;
  mesAno: string;
  proporcao: 5 | 6;
  diasSemanaFolga?: number[];
  excluirDomingos?: boolean;
  feriasInicio?: string;
  feriasFim?: string;
}): number {
  const { diasRestantes, janela, mesAno, proporcao, diasSemanaFolga, excluirDomingos, feriasInicio, feriasFim } =
    params;

  let dias: number;
  if (diasSemanaFolga && diasSemanaFolga.length > 0) {
    const folgaSet = new Set(diasSemanaFolga);
    dias = contarDias(janela, mesAno, feriasInicio, feriasFim, (weekday) => !folgaSet.has(weekday));
  } else {
    dias = Math.round((diasRestantes * proporcao) / 7);
  }

  if (excluirDomingos) {
    dias -= contarDias(janela, mesAno, feriasInicio, feriasFim, (weekday) => weekday === 0);
  }

  return Math.max(0, dias);
}

export interface ValeAjuste {
  diasSemanaFolga?: number[];
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
  const diasRestantes = removerFerias(janela, ajuste?.feriasInicio, ajuste?.feriasFim, mesAno);

  const diasVA = calcularDiasVale({
    diasRestantes,
    janela,
    mesAno,
    proporcao: 5,
    diasSemanaFolga: ajuste?.diasSemanaFolga,
    excluirDomingos: false,
    feriasInicio: ajuste?.feriasInicio,
    feriasFim: ajuste?.feriasFim,
  });

  const diasVT = calcularDiasVale({
    diasRestantes,
    janela,
    mesAno,
    proporcao: unidade === '710_711' ? 5 : 6,
    diasSemanaFolga: ajuste?.diasSemanaFolga,
    excluirDomingos: unidade === 'parkshopping',
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
