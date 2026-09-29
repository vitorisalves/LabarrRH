import { describe, it, expect } from 'vitest';
import { getDiasAtivosNoMes, removerFerias, calcularDiasVale, calcularValeFuncionario } from './valeCalculations';

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
  it('applies 5/7 proportion for 710/711 with no manual folgas', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ diasRestantes: 30, janela, mesAno: '2026-09', proporcao: 5 });
    expect(dias).toBe(Math.round((30 * 5) / 7));
  });

  it('uses exact remaining days minus manual folgas when folgas provided', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 5,
      folgasManuais: [6, 13, 20, 27],
    });
    expect(dias).toBe(26);
  });

  it('applies 6/7 proportion and subtracts Sundays for parkshopping', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 6,
      excluirDomingos: true,
    });
    const proporcional = Math.round((30 * 6) / 7);
    expect(dias).toBe(proporcional - countSundays(2026, 9));
  });

  it('subtracts Sundays even when manual folgas are set', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 6,
      folgasManuais: [10],
      excluirDomingos: true,
    });
    expect(dias).toBe(30 - 1 - countSundays(2026, 9));
  });

  it('never returns negative days', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({
      diasRestantes: 2,
      janela,
      mesAno: '2026-09',
      proporcao: 5,
      folgasManuais: Array.from({ length: 25 }, (_, i) => i + 1),
    });
    expect(dias).toBe(0);
  });
});

function countSundays(ano: number, mes: number): number {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  let count = 0;
  for (let d = 1; d <= diasNoMes; d++) {
    if (new Date(ano, mes - 1, d).getDay() === 0) count++;
  }
  return count;
}

describe('calcularValeFuncionario', () => {
  it('orchestrates window + ferias + proportion for 710_711', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorValeDia: 20 },
      '710_711',
      '2026-09'
    );
    expect(result.diasVale).toBe(21);
    expect(result.valorDia).toBe(20);
    expect(result.valorTotal).toBe(420);
  });

  it('orchestrates window + proportion + Sunday exclusion for parkshopping', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorValeDia: 15 },
      'parkshopping',
      '2026-09'
    );
    const expectedDias = Math.round((30 * 6) / 7) - countSundays(2026, 9);
    expect(result.diasVale).toBe(expectedDias);
    expect(result.valorTotal).toBe(expectedDias * 15);
  });

  it('applies ferias before proportion', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorValeDia: 20 },
      '710_711',
      '2026-09',
      { feriasInicio: '2026-09-01', feriasFim: '2026-09-30' }
    );
    expect(result.diasVale).toBe(0);
    expect(result.valorTotal).toBe(0);
  });

  it('defaults valorDia to 0 when not set', () => {
    const result = calcularValeFuncionario({ admissao: '01/01/2020' }, '710_711', '2026-09');
    expect(result.valorDia).toBe(0);
    expect(result.valorTotal).toBe(0);
  });
});
