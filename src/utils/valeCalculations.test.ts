import { describe, it, expect } from 'vitest';
import { getDiasAtivosNoMes, calcularDiasVale, calcularValeFuncionario } from './valeCalculations';

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

describe('calcularDiasVale', () => {
  it('defaults to 7/7 (every active day) with no folgas, ferias, or domingo exclusion', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ janela, mesAno: '2026-09' });
    expect(dias).toBe(30);
  });

  it('subtracts every occurrence of a manually marked weekday folga', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ janela, mesAno: '2026-09', diasSemanaFolga: [1] }); // segunda
    expect(dias).toBe(30 - countWeekday(2026, 9, 1));
  });

  it('subtracts multiple weekday folgas', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ janela, mesAno: '2026-09', diasSemanaFolga: [1, 3] }); // segunda + quarta
    expect(dias).toBe(30 - countWeekday(2026, 9, 1) - countWeekday(2026, 9, 3));
  });

  it('always excludes Sunday when excluirDomingos is set, regardless of folgas', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ janela, mesAno: '2026-09', excluirDomingos: true });
    expect(dias).toBe(30 - countWeekday(2026, 9, 0));
  });

  it('excludes Sunday and a manual folga together without double-counting overlaps', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      janela,
      mesAno: '2026-09',
      diasSemanaFolga: [1],
      excluirDomingos: true,
    });
    expect(dias).toBe(30 - countWeekday(2026, 9, 1) - countWeekday(2026, 9, 0));
  });

  it('subtracts ferias days and does not double-subtract a folga weekday inside ferias', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // Ferias covers the whole month; folga on Monday should not further reduce below 0
    const dias = calcularDiasVale({
      janela,
      mesAno: '2026-09',
      diasSemanaFolga: [1],
      feriasInicio: '2026-09-01',
      feriasFim: '2026-09-30',
    });
    expect(dias).toBe(0);
  });

  it('subtracts a partial ferias range correctly alongside a weekday folga', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // Ferias Sep 5-14 (10 days); folga on Monday for the rest of the month
    const dias = calcularDiasVale({
      janela,
      mesAno: '2026-09',
      diasSemanaFolga: [1],
      feriasInicio: '2026-09-05',
      feriasFim: '2026-09-14',
    });
    // Mondays in Sep 2026: 7, 14, 21, 28 -> only 21 and 28 remain outside ferias
    const mondaysOutsideFerias = 2;
    expect(dias).toBe(30 - 10 - mondaysOutsideFerias);
  });
});

describe('calcularValeFuncionario', () => {
  it('gives VA and VT the same day count (7/7 baseline) for 710_711, differing only by value', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 15 },
      '710_711',
      '2026-09',
      20
    );
    expect(result.diasVA).toBe(30);
    expect(result.diasVT).toBe(30);
    expect(result.valorVA).toBe(20);
    expect(result.totalVA).toBe(600);
    expect(result.valorVT).toBe(15);
    expect(result.totalVT).toBe(450);
  });

  it('excludes Sunday from VA only for parkshopping; VT counts every day', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 10 },
      'parkshopping',
      '2026-09',
      20
    );
    const vaEsperado = 30 - countWeekday(2026, 9, 0);
    expect(result.diasVA).toBe(vaEsperado);
    expect(result.diasVT).toBe(30);
  });

  it('applies ferias to both VA and VT', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorVT: 20 },
      '710_711',
      '2026-09',
      20,
      { feriasInicio: '2026-09-01', feriasFim: '2026-09-30' }
    );
    expect(result.diasVA).toBe(0);
    expect(result.diasVT).toBe(0);
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
