import { APPS_SCRIPT_URL } from './sheetsService';
import { FeriadosArmazenados } from '../types/vale';

export async function fetchFeriadosFromSheets(): Promise<FeriadosArmazenados> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=get_feriados`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) return { fabrica: [], loja: [] };
    const data = await response.json();
    return {
      fabrica: Array.isArray(data?.fabrica) ? data.fabrica : [],
      loja: Array.isArray(data?.loja) ? data.loja : [],
    };
  } catch (error) {
    console.error('Erro ao buscar feriados do Google Sheets:', error);
    return { fabrica: [], loja: [] };
  }
}

export async function saveFeriadosToSheets(feriados: FeriadosArmazenados): Promise<{ status: string }> {
  const payload = { action: 'save_feriados', fabrica: feriados.fabrica, loja: feriados.loja };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar feriados (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    return { status: 'success' };
  }
}

export interface FeriadoSugerido {
  data: string; // 'YYYY-MM-DD'
  nome: string;
}

/**
 * Feriados específicos de Brasília/DF sem cobertura confiável em API pública gratuita.
 */
function feriadosDF(ano: number): FeriadoSugerido[] {
  return [
    { data: `${ano}-04-21`, nome: 'Aniversário de Brasília' },
    { data: `${ano}-11-30`, nome: 'Dia do Evangélico (DF)' },
  ];
}

export async function fetchFeriadosSugeridos(ano: number): Promise<FeriadoSugerido[]> {
  const sugeridos: FeriadoSugerido[] = [];
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          sugeridos.push({ data: item.date, nome: item.name });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar feriados nacionais sugeridos:', error);
  }

  for (const feriado of feriadosDF(ano)) {
    if (!sugeridos.some((s) => s.data === feriado.data)) {
      sugeridos.push(feriado);
    }
  }

  return sugeridos.sort((a, b) => a.data.localeCompare(b.data));
}
