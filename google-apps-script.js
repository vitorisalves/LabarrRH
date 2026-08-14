/**
 * CÓDIGO GOOGLE APPS SCRIPT (Google Planilhas)
 * 
 * Como instalar no Google Planilhas:
 * 1. Abra sua planilha no Google Drive.
 * 2. Clique no menu "Extensões" > "Apps Script".
 * 3. Substitua todo o conteúdo pelo código abaixo.
 * 4. Clique em "Implantar" (Deploy) > "Gerenciar implantações" > Editar (ícone de lápis) > Nova Versão > Implantar.
 * 5. Garanta que o acesso esteja configurado para "Qualquer pessoa" (Anyone).
 */

const SHEET_TABS = {
  '710_711': '710/711',
  'parkshopping': 'Parkshopping',
  'freela': 'Freela',
  'inativo': 'Inativo'
};

const HEADERS = [
  'ID',
  'Nome',
  'CPF',
  'Endereço',
  'CEP',
  'Data de Nascimento',
  'Data de Admissão',
  'Cargo',
  'E-mail',
  'Chave PIX',
  'Tipo Chave PIX',
  'Contato de Emergência',
  'Parentesco',
  'Telefone Contato Emergência',
  'Observações',
  'Data de Desligamento',
  'Motivo Inativação',
  'Criado em',
  'Atualizado em'
];

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allEmployees = [];

    for (const [abaKey, tabName] of Object.entries(SHEET_TABS)) {
      let sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
        sheet.appendRow(HEADERS);
        formatHeaderRow(sheet);
      }

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;

      const headers = data[0].map(h => String(h || '').trim().toLowerCase());

      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;
        
        // Verifica se a linha tem qualquer dado
        const hasContent = row.some(cell => String(cell || '').trim() !== '');
        if (!hasContent) continue;

        const getVal = (colNames) => {
          for (const name of colNames) {
            const idx = headers.indexOf(name.toLowerCase());
            if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
              const val = row[idx];
              if (val instanceof Date) {
                const day = String(val.getDate()).padStart(2, '0');
                const month = String(val.getMonth() + 1).padStart(2, '0');
                const year = val.getFullYear();
                return `${day}/${month}/${year}`;
              }
              return String(val).trim();
            }
          }
          return '';
        };

        const nome = getVal(['Nome', 'nome', 'Funcionário', 'Funcionario', 'Nome Completo', 'Colaborador']);
        const cpf = getVal(['CPF', 'cpf']);
        const id = getVal(['ID', 'id']) || `emp_${abaKey}_${r}`;

        // Se nem o nome nem o CPF foram encontrados por cabeçalho, usa índice de fallback da planilha
        const finalNome = nome || (row[1] ? String(row[1]).trim() : '');
        const finalCpf = cpf || (row[2] ? String(row[2]).trim() : '');

        if (!finalNome && !finalCpf) continue;

        const chavePix = getVal(['Chave PIX', 'Chave Pix', 'pix', 'chave_pix']) || (row[9] ? String(row[9]).trim() : '');
        const rawTipo = getVal(['Tipo Chave PIX', 'Tipo Chave Pix', 'Tipo PIX', 'tipo_chave_pix']) || (row[10] ? String(row[10]).trim() : '');
        
        allEmployees.push({
          id: id,
          nome: finalNome,
          cpf: finalCpf,
          endereco: getVal(['Endereço', 'Endereco', 'endereco', 'Endereço Completo']) || (row[3] ? String(row[3]).trim() : ''),
          cep: getVal(['CEP', 'cep']) || (row[4] ? String(row[4]).trim() : ''),
          dataNascimento: getVal(['Data de Nascimento', 'dataNascimento', 'nascimento', 'Data Nascimento']) || (row[5] ? String(row[5]).trim() : ''),
          dataAdmissao: getVal(['Data de Admissão', 'dataAdmissao', 'admissao', 'Data Admissão']) || (row[6] ? String(row[6]).trim() : ''),
          cargo: getVal(['Cargo', 'cargo', 'Cargo / Função', 'Função', 'funcao', 'Funcao']) || (row[7] ? String(row[7]).trim() : ''),
          email: getVal(['E-mail', 'Email', 'email', 'E-Mail']) || (row[8] ? String(row[8]).trim() : ''),
          chavePix: chavePix,
          tipoChavePix: rawTipo,
          contatoEmergencia: getVal(['Contato de Emergência', 'contatoEmergencia', 'contato', 'Contato']) || (row[11] ? String(row[11]).trim() : ''),
          parentescoEmergencia: getVal(['Parentesco', 'parentescoEmergencia']) || (row[12] ? String(row[12]).trim() : ''),
          telefoneContatoEmergencia: getVal(['Telefone Contato Emergência', 'telefoneContatoEmergencia', 'telefone emergencia', 'Telefone Emergência']) || (row[13] ? String(row[13]).trim() : ''),
          aba: abaKey,
          observacoes: getVal(['Observações', 'Observacoes', 'observacoes']) || (row[14] ? String(row[14]).trim() : ''),
          dataDesligamento: getVal(['Data de Desligamento', 'dataDesligamento', 'desligamento']) || (row[15] ? String(row[15]).trim() : ''),
          motivoInativacao: getVal(['Motivo Inativação', 'motivoInativacao', 'motivo']) || (row[16] ? String(row[16]).trim() : ''),
          createdAt: getVal(['Criado em', 'createdAt']) || new Date().toISOString(),
          updatedAt: getVal(['Atualizado em', 'updatedAt']) || new Date().toISOString()
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(allEmployees))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);

    if (body.action === 'sync_all' && Array.isArray(body.employees)) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // Agrupar por aba
      const grouped = {
        '710_711': [],
        'parkshopping': [],
        'freela': [],
        'inativo': []
      };

      body.employees.forEach(emp => {
        const aba = emp.aba || '710_711';
        if (grouped[aba]) {
          grouped[aba].push(emp);
        } else {
          grouped['710_711'].push(emp);
        }
      });

      for (const [abaKey, tabName] of Object.entries(SHEET_TABS)) {
        let sheet = ss.getSheetByName(tabName);
        if (!sheet) {
          sheet = ss.insertSheet(tabName);
        }

        sheet.clearContents();
        sheet.appendRow(HEADERS);
        formatHeaderRow(sheet);

        const rows = grouped[abaKey].map(emp => [
          emp.id || '',
          emp.nome || '',
          emp.cpf || '',
          emp.endereco || '',
          emp.cep || '',
          emp.dataNascimento || '',
          emp.dataAdmissao || '',
          emp.cargo || '',
          emp.email || '',
          emp.chavePix || '',
          emp.tipoChavePix || '',
          emp.contatoEmergencia || '',
          emp.parentescoEmergencia || '',
          emp.telefoneContatoEmergencia || '',
          emp.observacoes || '',
          emp.dataDesligamento || '',
          emp.motivoInativacao || '',
          emp.createdAt || '',
          emp.updatedAt || ''
        ]);

        if (rows.length > 0) {
          sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: body.employees.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e293b');
  headerRange.setFontColor('#f8fafc');
  sheet.setFrozenRows(1);
}
