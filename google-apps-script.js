/**
 * CÓDIGO GOOGLE APPS SCRIPT (Google Planilhas)
 * 
 * Este script adiciona um menu diretamente na barra do Google Sheets
 * e inclui uma função para criar a coluna Cargo automaticamente.
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
  'Setor',
  'Valor VT/Dia',
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

const VALE_SHEET_TABS = {
  '710_711': 'Vale 710_711',
  'parkshopping': 'Vale Parkshopping'
};

const VALE_HEADERS = [
  'FuncionarioId',
  'MesAno',
  'DiasVA',
  'ValorVA',
  'TotalVA',
  'DiasVT',
  'ValorVT',
  'TotalVT',
  'DiasSemanaFolga',
  'FolgasExtras',
  'FeriasInicio',
  'FeriasFim',
  'AtualizadoEm'
];

const CONFIG_SHEET_NAME = 'Config';

/**
 * Cria o menu personalizado no Google Sheets ao abrir a planilha
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ Sistema RH')
    .addItem('1. Criar/Atualizar Cabeçalhos com Coluna Cargo', 'atualizarEstruturaCabecalhos')
    .addToUi();
}

/**
 * Função direta para forçar a criação dos cabeçalhos em todas as 4 abas
 * Pode ser executada clicando no menu "⚙️ Sistema RH" > "1. Criar/Atualizar Cabeçalhos com Coluna Cargo"
 * ou selecionando esta função no editor e clicando em "Executar" (Run).
 */
function atualizarEstruturaCabecalhos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (const [abaKey, tabName] of Object.entries(SHEET_TABS)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    const currentData = sheet.getDataRange().getValues();
    
    // Se a aba estiver vazia ou com apenas cabeçalhos antigos
    if (currentData.length <= 1) {
      sheet.clearContents();
      sheet.appendRow(HEADERS);
      formatHeaderRow(sheet);
    } else {
      // Se já tiver colaboradores, verifica se a coluna Cargo existe
      const currentHeaders = currentData[0].map(h => String(h || '').trim().toLowerCase());
      const hasCargo = currentHeaders.includes('cargo') || currentHeaders.includes('cargo / função') || currentHeaders.includes('função');
      
      if (!hasCargo) {
        // Encontra o índice da Data de Admissão para inserir Cargo logo após
        let insertIndex = currentHeaders.indexOf('data de admissão');
        if (insertIndex === -1) insertIndex = currentHeaders.indexOf('data admissão');
        if (insertIndex === -1) insertIndex = 6; // coluna G por padrão

        sheet.insertColumnAfter(insertIndex + 1);
        sheet.getRange(1, insertIndex + 2).setValue('Cargo');
        formatHeaderRow(sheet);
      }
    }
  }

  try {
    SpreadsheetApp.getUi().alert('Estrutura de colunas atualizada com sucesso! A coluna Cargo foi inserida nas 4 abas.');
  } catch (e) {
    Logger.log('Atualizado com sucesso.');
  }
}

function doGet(e) {
  const action = e.parameter && e.parameter.action;
  if (action === 'get_vales') {
    return handleGetVales(e);
  }
  if (action === 'get_config') {
    return handleGetConfig();
  }
  return handleGetEmployees();
}

function normalizeMesAno(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  return String(value || '');
}

function handleGetVales(e) {
  try {
    const unidade = e.parameter.unidade;
    const tabName = VALE_SHEET_TABS[unidade];
    if (!tabName) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const rows = data.slice(1).map((row) => ({
      funcionarioId: String(row[0] || ''),
      mesAno: normalizeMesAno(row[1]),
      diasVA: Number(row[2] || 0),
      valorVA: Number(row[3] || 0),
      totalVA: Number(row[4] || 0),
      diasVT: Number(row[5] || 0),
      valorVT: Number(row[6] || 0),
      totalVT: Number(row[7] || 0),
      diasSemanaFolga: String(row[8] || '')
        .split(',')
        .filter((v) => v.trim() !== '')
        .map(Number),
      folgasExtras: String(row[9] || '')
        .split(',')
        .filter((v) => v.trim() !== ''),
      feriasInicio: String(row[10] || ''),
      feriasFim: String(row[11] || ''),
    }));

    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ valorVA: 0 })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    let valorVA = 0;
    // Usa a ÚLTIMA ocorrência (não a primeira): protege contra linhas 'valorVA'
    // órfãs de execuções antigas, que ficam acima da mais recente.
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0] || '').trim() === 'valorVA') {
        valorVA = Number(data[r][1]) || 0;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ valorVA })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetEmployees() {
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

        // Identifica Nome
        let nome = getVal(['Nome', 'nome', 'Funcionário', 'Funcionario', 'Nome Completo', 'Colaborador']);
        if (!nome) {
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

        if (!nome && !cpf) continue;

        const id = getVal(['ID', 'id']) || `emp_${abaKey}_${r}`;
        const chavePix = getVal(['Chave PIX', 'Chave Pix', 'chave pix', 'pix', 'chave_pix']);
        const tipoChavePix = getVal(['Tipo Chave PIX', 'Tipo Chave Pix', 'tipo pix', 'tipo_chave_pix']);
        const cargo = getVal(['Cargo', 'cargo', 'Cargo / Função', 'Função', 'funcao', 'Funcao']);
        const setor = getVal(['Setor', 'setor']);
        const valorVT = getVal(['Valor VT/Dia', 'valorVT', 'Valor VT Dia', 'Valor Vale/Dia']);

        allEmployees.push({
          id: id,
          nome: nome || 'Sem Nome',
          cpf: cpf || '',
          endereco: getVal(['Endereço', 'Endereco', 'endereco', 'Endereço Completo']),
          cep: getVal(['CEP', 'cep']),
          dataNascimento: getVal(['Data de Nascimento', 'dataNascimento', 'nascimento', 'Data Nascimento']),
          dataAdmissao: getVal(['Data de Admissão', 'dataAdmissao', 'admissao', 'Data Admissão']),
          cargo: cargo,
          setor: setor,
          valorVT: valorVT ? Number(String(valorVT).replace(',', '.')) : 0,
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

    if (body.action === 'sync_vales') {
      return handleSyncVales(body);
    }

    if (body.action === 'save_config') {
      return handleSaveConfig(body);
    }

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
          emp.setor || '',
          emp.valorVT || '',
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

function handleSyncVales(body) {
  try {
    const unidade = body.unidade;
    const mesAno = body.mesAno;
    const registros = body.registros || [];
    const tabName = VALE_SHEET_TABS[unidade];

    if (!tabName) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(VALE_HEADERS);
      formatHeaderRow(sheet);
    }

    const data = sheet.getDataRange().getValues();
    const existingRows = data.length > 1 ? data.slice(1) : [];

    const keptRows = existingRows.filter((row) => normalizeMesAno(row[1]) !== mesAno);

    const now = new Date().toISOString();
    const newRows = registros.map((r) => [
      r.funcionarioId || '',
      mesAno,
      r.diasVA || 0,
      r.valorVA || 0,
      r.totalVA || 0,
      r.diasVT || 0,
      r.valorVT || 0,
      r.totalVT || 0,
      (r.diasSemanaFolga || []).join(','),
      (r.folgasExtras || []).join(','),
      r.feriasInicio || '',
      r.feriasFim || '',
      now,
    ]);

    const allRows = keptRows.concat(newRows);

    sheet.clearContents();
    sheet.appendRow(VALE_HEADERS);
    formatHeaderRow(sheet);
    if (allRows.length > 0) {
      // Força texto puro em MesAno/FeriasInicio/FeriasFim para o Sheets não
      // autoconverter para Data, o que quebraria a comparação de upsert acima.
      sheet.getRange(2, 2, allRows.length, 1).setNumberFormat('@');
      sheet.getRange(2, 10, allRows.length, 1).setNumberFormat('@');
      sheet.getRange(2, 11, allRows.length, 1).setNumberFormat('@');
      sheet.getRange(2, 12, allRows.length, 1).setNumberFormat('@');
      sheet.getRange(2, 1, allRows.length, VALE_HEADERS.length).setValues(allRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: registros.length })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSaveConfig(body) {
  try {
    const valorVA = Number(body.valorVA) || 0;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    }

    // Limpa e reescreve por completo: evita linhas 'valorVA' órfãs/duplicadas
    // de execuções anteriores fazendo com que a leitura pegue um valor antigo.
    sheet.clearContents();
    sheet.appendRow(['Chave', 'Valor']);
    formatHeaderRow(sheet);
    sheet.appendRow(['valorVA', valorVA]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', valorVA })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e293b');
  headerRange.setFontColor('#f8fafc');
  sheet.setFrozenRows(1);
}
