import { Employee } from '../types';
import { formatDateBR, detectPixType } from '../utils/formatters';

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz0EZ0jPYg9yGPvZfPLgNWnvptl8FbDDatCrbXQ-Fg_g0upXUcefsxAiC7GhpD3kgi3uw/exec';

/**
 * Busca todos os funcionários das 4 abas do Google Sheets
 */
export async function fetchEmployeesFromSheets(): Promise<Employee[]> {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Falha ao conectar com o Google Sheets (${response.status})`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data
        .filter((item: any) => item && (item.nome || item.Nome || item.cpf || item.CPF || item.id))
        .map((item: any, index: number) => {
          const rawNome = item.nome || item.Nome || item.Funcionario || item['Funcionário'] || item['Nome Completo'] || '';
          const rawChavePix = item.chavePix || item['Chave PIX'] || item['Chave Pix'] || item['chave_pix'] || item.pix || '';
          const rawTipoPix = item.tipoChavePix || item['Tipo Chave PIX'] || item['Tipo Chave Pix'] || item['Tipo PIX'] || item['tipo_chave_pix'] || '';
          const detectedTipo = detectPixType(rawChavePix, rawTipoPix);

          const rawCargo = item.cargo || item.Cargo || item.funcao || item.Funcao || item['Função'] || item['Cargo / Função'] || item['Cargo/Função'] || '';

          return {
            id: item.id || `emp_remote_${index + 1}_${Date.now()}`,
            nome: rawNome,
            cpf: item.cpf || item.CPF || '',
            endereco: item.endereco || item.Endereco || item['Endereço'] || '',
            cep: item.cep || item.CEP || '',
            dataNascimento: item.dataNascimento || item['Data de Nascimento'] ? formatDateBR(item.dataNascimento || item['Data de Nascimento']) : '',
            dataAdmissao: item.dataAdmissao || item['Data de Admissão'] ? formatDateBR(item.dataAdmissao || item['Data de Admissão']) : '',
            email: item.email || item.Email || item['E-mail'] || '',
            chavePix: rawChavePix,
            tipoChavePix: detectedTipo,
            contatoEmergencia: item.contatoEmergencia || item['Contato de Emergência'] || item['Contato Emergência'] || '',
            parentescoEmergencia: item.parentescoEmergencia || item['Parentesco'] || '',
            telefoneContatoEmergencia: item.telefoneContatoEmergencia || item['Telefone Emergência'] || item['Telefone Contato Emergência'] || '',
            aba: item.aba || item.Aba || '710_711',
            cargo: rawCargo,
            observacoes: item.observacoes || item.Observacoes || item['Observações'] || '',
            dataDesligamento: item.dataDesligamento || item['Data de Desligamento'] ? formatDateBR(item.dataDesligamento || item['Data de Desligamento']) : '',
            motivoInativacao: item.motivoInativacao || item['Motivo Inativação'] || item['Motivo da Inativação'] || '',
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          };
        });
    }

    return [];
  } catch (error) {
    console.error('Erro ao buscar dados do Google Sheets:', error);
    return [];
  }
}

/**
 * Sincroniza a lista completa de funcionários com as 4 abas do Google Sheets
 */
export async function syncEmployeesToSheets(employees: Employee[]): Promise<{ status: string; count?: number; message?: string }> {
  // Formata as datas para padrão brasileiro DD/MM/AAAA e normaliza chave PIX e Cargo
  const formattedEmployees = employees.map((emp) => ({
    ...emp,
    cargo: emp.cargo || '',
    tipoChavePix: emp.tipoChavePix || detectPixType(emp.chavePix),
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

