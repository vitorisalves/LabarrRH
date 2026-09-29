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

function contarDomingos(janela: JanelaAtiva, mesAno: string): number {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const inicio = janela.inicio < inicioMes ? inicioMes : janela.inicio;
  const fim = janela.fim > fimMes ? fimMes : janela.fim;

  let count = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) count++;
  }
  return count;
}

export function calcularDiasVale(params: {
  diasRestantes: number;
  janela: JanelaAtiva;
  mesAno: string;
  proporcao: 5 | 6;
  folgasManuais?: number[];
  excluirDomingos?: boolean;
}): number {
  const { diasRestantes, janela, mesAno, proporcao, folgasManuais, excluirDomingos } = params;

  let dias: number;
  if (folgasManuais && folgasManuais.length > 0) {
    dias = diasRestantes - folgasManuais.length;
  } else {
    dias = Math.round((diasRestantes * proporcao) / 7);
  }

  if (excluirDomingos) {
    dias -= contarDomingos(janela, mesAno);
  }

  return Math.max(0, dias);
}

export interface ValeAjuste {
  folgasManuais?: number[];
  feriasInicio?: string;
  feriasFim?: string;
}

export interface ValeResultado {
  diasVale: number;
  valorDia: number;
  valorTotal: number;
}

export function calcularValeFuncionario(
  employee: { admissao: string; desligamento?: string; valorValeDia?: number },
  unidade: '710_711' | 'parkshopping',
  mesAno: string,
  ajuste?: ValeAjuste
): ValeResultado {
  const janela = getDiasAtivosNoMes(employee.admissao, employee.desligamento, mesAno);
  const diasRestantes = removerFerias(janela, ajuste?.feriasInicio, ajuste?.feriasFim, mesAno);

  const diasVale = calcularDiasVale({
    diasRestantes,
    janela,
    mesAno,
    proporcao: unidade === '710_711' ? 5 : 6,
    folgasManuais: ajuste?.folgasManuais,
    excluirDomingos: unidade === 'parkshopping',
  });

  const valorDia = employee.valorValeDia || 0;
  return { diasVale, valorDia, valorTotal: diasVale * valorDia };
}
