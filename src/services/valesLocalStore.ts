import { AjusteArmazenado, UnidadeVale } from '../types/vale';

const STORAGE_KEY = 'rh_vale_ajustes_v1';

function loadAll(): AjusteArmazenado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler ajustes de vale do localStorage', e);
    return [];
  }
}

function saveAll(ajustes: AjusteArmazenado[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ajustes));
  } catch (e) {
    console.error('Erro ao salvar ajustes de vale no localStorage', e);
  }
}

function matchKey(a: AjusteArmazenado, funcionarioId: string, unidade: UnidadeVale, mesAno: string): boolean {
  return a.funcionarioId === funcionarioId && a.unidade === unidade && a.mesAno === mesAno;
}

export function getAjuste(
  funcionarioId: string,
  unidade: UnidadeVale,
  mesAno: string
): AjusteArmazenado | undefined {
  return loadAll().find((a) => matchKey(a, funcionarioId, unidade, mesAno));
}

export function saveAjuste(ajuste: AjusteArmazenado): void {
  const all = loadAll();
  const idx = all.findIndex((a) => matchKey(a, ajuste.funcionarioId, ajuste.unidade, ajuste.mesAno));
  if (idx >= 0) {
    all[idx] = ajuste;
  } else {
    all.push(ajuste);
  }
  saveAll(all);
}

export function getAllAjustesForMonth(unidade: UnidadeVale, mesAno: string): AjusteArmazenado[] {
  return loadAll().filter((a) => a.unidade === unidade && a.mesAno === mesAno);
}
