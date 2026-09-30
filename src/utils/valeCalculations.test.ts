import { describe, it, expect } from 'vitest';
import { getDiasAtivosNoMes, removerFerias, calcularDiasVale, calcularValeFuncionario } from './valeCalculations';

function countWeekday(ano: number, mes: number, weekday: number): number {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  let count = 0;
  for (let d = 1; d <= diasNoMes; d++) {
    if (new Date(ano, mes - 1, d).getDay() === weekday) count++;
  }
  return count;
}

describe('getDiasAtivosNoMes', () => {
  it('returns full month when admissao is before the month and no desligamento', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(janela.totalDias).toBe(30);
  });

  it('clips to admission date when hired mid-month', () => {
    const janela = getDiasAtivosNoMes('15/09/2026', undefined, '2026-09');
    expect(janela.totalDias).toBe(16);
  });

  it('clips to desligamento date when terminated mid-month', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', '10/09/2026', '2026-09');
    expect(janela.totalDias).toBe(10);
  });

  it('returns 0 when the employee was not active during the month', () => {
    const janela = getDiasAtivosNoMes('01/10/2026', undefined, '2026-09');
    expect(janela.totalDias).toBe(0);
  });
});

describe('removerFerias', () => {
  it('returns totalDias unchanged when no ferias set', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(removerFerias(janela, undefined, undefined, '2026-09')).toBe(30);
  });

  it('subtracts vacation days that fall inside the month and window', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(removerFerias(janela, '2026-09-05', '2026-09-14', '2026-09')).toBe(20);
  });

  it('clips vacation range to the month boundaries', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(removerFerias(janela, '2026-08-25', '2026-09-05', '2026-09')).toBe(25);
  });
});

describe('calcularDiasVale', () => {
  it('applies 5/7 proportion (VA-style) with no manual folgas', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ diasRestantes: 30, janela, mesAno: '2026-09', proporcao: 5 });
    expect(dias).toBe(Math.round((30 * 5) / 7));
  });

  it('uses weekday-based folga count when diasSemanaFolga is set', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // Segunda-feira (1) as the fixed day off in September 2026
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 5,
      diasSemanaFolga: [1],
    });
    expect(dias).toBe(30 - countWeekday(2026, 9, 1));
  });

  it('applies 6/7 proportion and subtracts Sundays for parkshopping VT', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 6,
      excluirDomingos: true,
    });
    const proporcional = Math.round((30 * 6) / 7);
    expect(dias).toBe(proporcional - countWeekday(2026, 9, 0));
  });

  it('subtracts Sundays even when weekday folgas are set', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 6,
      diasSemanaFolga: [2], // terça
      excluirDomingos: true,
    });
    expect(dias).toBe(30 - countWeekday(2026, 9, 2) - countWeekday(2026, 9, 0));
  });

  it('does not double-count a weekday folga that falls inside ferias', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // Ferias covers the whole month; folga on Monday should not further reduce below 0
    const dias = calcularDiasVale({
      diasRestantes: 0,
      janela,
      mesAno: '2026-09',
      proporcao: 5,
      diasSemanaFolga: [1],
      feriasInicio: '2026-09-01',
      feriasFim: '2026-09-30',
    });
    expect(dias).toBe(0);
  });

  it('never returns negative days', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 2,
      janela,
      mesAno: '2026-09',
      proporcao: 5,
      diasSemanaFolga: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(dias).toBe(0);
  });
});

describe('calcularValeFuncionario', () => {
  it('computes VA (always 5/7, global value) and VT (unit proportion, per-employee value) for 710_711', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 15 },
      '710_711',
      '2026-09',
      20
    );
    const esperado = Math.round((30 * 5) / 7);
    expect(result.diasVA).toBe(esperado);
    expect(result.valorVA).toBe(20);
    expect(result.totalVA).toBe(esperado * 20);
    expect(result.diasVT).toBe(esperado); // same 5/7 proportion for 710/711 VT
    expect(result.valorVT).toBe(15);
    expect(result.totalVT).toBe(esperado * 15);
  });

  it('computes VA without Sunday exclusion but VT with it for parkshopping', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 10 },
      'parkshopping',
      '2026-09',
      20
    );
    const vaEsperado = Math.round((30 * 5) / 7);
    const vtEsperado = Math.round((30 * 6) / 7) - countWeekday(2026, 9, 0);
    expect(result.diasVA).toBe(vaEsperado);
    expect(result.diasVT).toBe(vtEsperado);
    expect(result.totalVA).toBe(vaEsperado * 20);
    expect(result.totalVT).toBe(vtEsperado * 10);
  });

  it('applies ferias before both VA and VT calculations', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 20 },
      '710_711',
      '2026-09',
      20,
      { feriasInicio: '2026-09-01', feriasFim: '2026-09-30' }
    );
    expect(result.diasVA).toBe(0);
    expect(result.diasVT).toBe(0);
    expect(result.totalVA).toBe(0);
    expect(result.totalVT).toBe(0);
  });

  it('defaults valorVT to 0 when not set', () => {
    const result = calcularValeFuncionario({ admissao: '01/01/2020' }, '710_711', '2026-09', 20);
    expect(result.valorVT).toBe(0);
    expect(result.totalVT).toBe(0);
  });

  it('applies weekday folga consistently to both VA and VT', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 10 },
      '710_711',
      '2026-09',
      20,
      { diasSemanaFolga: [1] } // segunda
    );
    const esperado = 30 - countWeekday(2026, 9, 1);
    expect(result.diasVA).toBe(esperado);
    expect(result.diasVT).toBe(esperado);
  });
});
