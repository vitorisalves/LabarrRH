/**
 * CÓDIGO GOOGLE APPS SCRIPT (Google Planilhas)
 * 
 * Instruções para atualizar sua planilha:
 * 1. Abra sua planilha no Google Sheets.
 * 2. Acesse: Extensões > Apps Script.
 * 3. Substitua TODO o código existente pelo código abaixo.
 * 4. Clique em "Implantar" > "Gerenciar implantações" > Editar (lápis) > Nova Versão > Implantar.
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
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;

      // Normaliza cabeçalhos da linha 1
      const headers = data[0].map(h => String(h || '').trim().toLowerCase());

      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;

        const hasContent = row.some(cell => String(cell || '').trim() !== '');
        if (!hasContent) continue;

        const getVal = (possibleNames) => {
          for (const name of possibleNames) {
            const idx = headers.indexOf(name.toLowerCase());
            if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
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

        // Identifica Nome (procura por cabeçalho ou nas primeiras 3 colunas)
        let nome = getVal(['Nome', 'nome', 'Funcionário', 'Funcionario', 'Nome Completo', 'Colaborador']);
        if (!nome) {
          // Se coluna 0 não for ID numérico/chave, pode ser nome
          if (row[0] && !String(row[0]).toLowerCase().startsWith('emp_') && !/^\d{3}\.\d{3}/.test(String(row[0]))) {
            nome = String(row[0]).trim();
          } else if (row[1] && !/^\d{3}\.\d{3}/.test(String(row[1]))) {
            nome = String(row[1]).trim();
          }
        }

        // Identifica CPF
        let cpf = getVal(['CPF', 'cpf', 'Documento']);
        if (!cpf) {
          for (let i = 0; i < Math.min(row.length, 5); i++) {
            const cell = String(row[i] || '').trim();
            if (/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(cell)) {
              cpf = cell;
              break;
            }
          }
        }

        // Se não tem nem nome nem CPF, pula
        if (!nome && !cpf) continue;

        const id = getVal(['ID', 'id']) || `emp_${abaKey}_${r}`;
        const chavePix = getVal(['Chave PIX', 'Chave Pix', 'chave pix', 'pix', 'chave_pix']);
        const tipoChavePix = getVal(['Tipo Chave PIX', 'Tipo Chave Pix', 'tipo pix', 'tipo_chave_pix']);
        const cargo = getVal(['Cargo', 'cargo', 'Cargo / Função', 'Função', 'funcao', 'Funcao']);

        allEmployees.push({
          id: id,
          nome: nome || 'Sem Nome',
          cpf: cpf || '',
          endereco: getVal(['Endereço', 'Endereco', 'endereco', 'Endereço Completo']),
          cep: getVal(['CEP', 'cep']),
          dataNascimento: getVal(['Data de Nascimento', 'dataNascimento', 'nascimento', 'Data Nascimento']),
          dataAdmissao: getVal(['Data de Admissão', 'dataAdmissao', 'admissao', 'Data Admissão']),
          cargo: cargo,
          email: getVal(['E-mail', 'Email', 'email', 'E-Mail']),
          chavePix: chavePix,
          tipoChavePix: tipoChavePix,
          contatoEmergencia: getVal(['Contato de Emergência', 'contatoEmergencia', 'contato', 'Contato']),
          parentescoEmergencia: getVal(['Parentesco', 'parentescoEmergencia']),
          telefoneContatoEmergencia: getVal(['Telefone Contato Emergência', 'telefoneContatoEmergencia', 'telefone emergencia', 'Telefone Emergência']),
          aba: abaKey,
          observacoes: getVal(['Observações', 'Observacoes', 'observacoes']),
          dataDesligamento: getVal(['Data de Desligamento', 'dataDesligamento', 'desligamento']),
          motivoInativacao: getVal(['Motivo Inativação', 'motivoInativacao', 'motivo']),
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
