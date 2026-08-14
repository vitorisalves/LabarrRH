import { Employee } from '../types';
import { formatDateBR } from '../utils/formatters';

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz0EZ0jPYg9yGPvZfPLgNWnvptl8FbDDatCrbXQ-Fg_g0upXUcefsxAiC7GhpD3kgi3uw/exec';

/**
 * Busca todos os funcionários das 4 abas do Google Sheets
 */
export async function fetchEmployeesFromSheets(): Promise<Employee[]> {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Falha ao conectar com o Google Sheets (${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data.map((item: Partial<Employee>, index: number) => ({
      id: item.id || `emp_remote_${index + 1}_${Date.now()}`,
      nome: item.nome || '',
      cpf: item.cpf || '',
      endereco: item.endereco || '',
      cep: item.cep || '',
      dataNascimento: item.dataNascimento ? formatDateBR(item.dataNascimento) : '',
      dataAdmissao: item.dataAdmissao ? formatDateBR(item.dataAdmissao) : '',
      email: item.email || '',
      chavePix: item.chavePix || '',
      tipoChavePix: item.tipoChavePix || 'CPF',
      contatoEmergencia: item.contatoEmergencia || '',
      parentescoEmergencia: item.parentescoEmergencia || '',
      telefoneContatoEmergencia: item.telefoneContatoEmergencia || '',
      aba: item.aba || '710_711',
      cargo: item.cargo || '',
      observacoes: item.observacoes || '',
      dataDesligamento: item.dataDesligamento ? formatDateBR(item.dataDesligamento) : '',
      motivoInativacao: item.motivoInativacao || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }));
  }

  return [];
}

/**
 * Sincroniza a lista completa de funcionários com as 4 abas do Google Sheets
 */
export async function syncEmployeesToSheets(employees: Employee[]): Promise<{ status: string; count?: number; message?: string }> {
  // Formata as datas para padrão brasileiro DD/MM/AAAA antes do envio
  const formattedEmployees = employees.map((emp) => ({
    ...emp,
    dataNascimento: emp.dataNascimento ? formatDateBR(emp.dataNascimento) : '',
    dataAdmissao: emp.dataAdmissao ? formatDateBR(emp.dataAdmissao) : '',
    dataDesligamento: emp.dataDesligamento ? formatDateBR(emp.dataDesligamento) : '',
  }));

  const payload = {
    action: 'sync_all',
    employees: formattedEmployees,
  };

  // Usamos text/plain para evitar problemas de CORS com preflight OPTIONS do Google Apps Script
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar dados ao Google Sheets (${response.status})`);
  }

  try {
    const result = await response.json();
    return result;
  } catch {
    return { status: 'success', count: employees.length };
  }
}

