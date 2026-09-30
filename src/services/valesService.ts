import { APPS_SCRIPT_URL } from './sheetsService';
import { UnidadeVale } from '../types/vale';

export interface ValeSheetRow {
  funcionarioId: string;
  mesAno: string;
  diasVA: number;
  valorVA: number;
  totalVA: number;
  diasVT: number;
  valorVT: number;
  totalVT: number;
  diasSemanaFolga: number[];
  feriasInicio: string;
  feriasFim: string;
}

export async function fetchValesFromSheets(unidade: UnidadeVale): Promise<ValeSheetRow[]> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=get_vales&unidade=${unidade}`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Erro ao buscar vales do Google Sheets:', error);
    return [];
  }
}

export async function syncValesToSheets(
  unidade: UnidadeVale,
  mesAno: string,
  registros: Array<{
    funcionarioId: string;
    diasVA: number;
    valorVA: number;
    totalVA: number;
    diasVT: number;
    valorVT: number;
    totalVT: number;
    diasSemanaFolga?: number[];
    feriasInicio?: string;
    feriasFim?: string;
  }>
): Promise<{ status: string; count?: number }> {
  const payload = { action: 'sync_vales', unidade, mesAno, registros };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao sincronizar vales (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    return { status: 'success', count: registros.length };
  }
}

export async function fetchValorVAConfig(): Promise<number> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=get_config`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) return 0;
    const data = await response.json();
    return Number(data?.valorVA) || 0;
  } catch (error) {
    console.error('Erro ao buscar configuração de VA do Google Sheets:', error);
    return 0;
  }
}

export async function saveValorVAConfig(valorVA: number): Promise<{ status: string }> {
  const payload = { action: 'save_config', valorVA };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar valor de VA (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    return { status: 'success' };
  }
}
