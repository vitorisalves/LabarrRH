# Vales de Funcionários — Design

## Contexto

O sistema LabarrRH gerencia funcionários em duas unidades — **710/711** (escala 5x2) e **Parkshopping** (escala 6x1) — com dados persistidos numa planilha Google Sheets via uma Web App do Google Apps Script (`google-apps-script.js`), acessada pelo frontend em `src/services/sheetsService.ts`.

Precisamos de uma funcionalidade de **controle de vales** (vale-transporte/alimentação por dia trabalhado), calculada mensalmente, separada por unidade, com persistência na mesma planilha.

## Regras de negócio

### Valor do vale

- Cada funcionário (de qualquer unidade) tem um campo individual `valorValeDia` (número, em R$), editável e salvo — **não há valor global**.
- Esse campo é armazenado como uma nova coluna na aba de funcionários já existente na planilha (710/711 e Parkshopping), sincronizado pelo mesmo fluxo de sync que já existe hoje para os demais campos do funcionário.

### Cálculo de dias de vale — 710/711 (escala 5x2)

1. Janela de dias ativos no mês selecionado = interseção entre (dataAdmissao, dataDesligamento ou fim do mês) e o mês selecionado.
2. Se houver férias marcadas para aquele funcionário que caem no mês, esses dias são removidos da janela.
3. Se houver folgas manuais marcadas para aquele funcionário/mês, dias de vale = (dias restantes na janela) − (folgas manuais marcadas), ignorando a proporção.
4. Caso contrário, dias de vale = dias da janela restante × 5/7, arredondado (`Math.round`).
5. Valor do vale no mês = dias de vale × `valorValeDia`.

### Cálculo de dias de vale — Parkshopping (escala 6x1)

Mesmos passos 1–4 acima, mas com proporção 6/7 no passo 4, e um passo adicional:

5. Subtrai do resultado todos os domingos que caem dentro da janela de dias ativos do mês (domingo é trabalhado mas nunca gera vale).
6. Valor do vale no mês = dias de vale × `valorValeDia`.

Sábado é dia normal de vale (gera vale integralmente).

### Ajustes manuais por funcionário/mês

Dois tipos de ajuste manual, aplicáveis a ambas unidades, sempre relativos a um funcionário + mês/ano específico:

- **Folgas do mês**: lista de dias específicos do mês marcados como folga. Quando presente para aquele funcionário/mês, o sistema usa a contagem real (janela de dias ativos − folgas marcadas) em vez da proporção automática.
- **Férias**: período (data início, data fim). Todos os dias desse período que caem no mês selecionado são removidos da janela de dias ativos antes de qualquer outro cálculo (folgas manuais ou proporção), em qualquer unidade.

Ambos os ajustes são opcionais; na ausência deles, vale o cálculo automático por proporção.

## Arquitetura

### Dados — planilha Google Sheets

- **Abas de funcionários existentes (710/711, Parkshopping)**: nova coluna `Valor Vale/Dia`.
- **Duas novas abas**: `Vale 710_711` e `Vale Parkshopping`, guardando o snapshot mensal calculado por funcionário: `funcionarioId`, `mesAno` (formato `YYYY-MM`), `diasVale`, `valorDia`, `valorTotal`, `folgasManuais` (lista de dias, serializada como string `"3,10,17"` ou vazio), `feriasInicio`, `feriasFim` (vazios se não houver), `atualizadoEm`.
- Cada sincronização de um mês/unidade sobrescreve as linhas daquele `mesAno` para aquela unidade (upsert por `funcionarioId` + `mesAno`), preservando outros meses já sincronizados.

### Backend — Google Apps Script (`google-apps-script.js`)

- Estende `HEADERS` e a leitura/escrita de funcionários (`doGet`/`doPost` existentes) para incluir `Valor Vale/Dia` — sem quebrar o contrato atual (campo novo, opcional, default vazio).
- Novas ações roteadas por `e.parameter.action` (GET) e `body.action` (POST), preservando o comportamento atual como default quando `action` não é informado:
  - `GET ?action=get_vales&unidade=710_711|parkshopping` → retorna todos os snapshots salvos daquela unidade (todos os meses).
  - `POST { action: 'sync_vales', unidade, mesAno, registros: [...] }` → upsert das linhas daquele mês/unidade na aba correspondente.

### Frontend

- **Tipos** (`src/types.ts`): adicionar `valorValeDia?: number` em `Employee`. Novo arquivo `src/types/vale.ts` (ou seção em `types.ts`) com `ValeAjuste { funcionarioId: string; mesAno: string; folgasManuais?: number[]; feriasInicio?: string; feriasFim?: string }` e `ValeCalculado { funcionarioId, nome, cargo, chavePix, diasVale, valorDia, valorTotal }`.
- **Cálculo** (`src/utils/valeCalculations.ts`): funções puras e testáveis:
  - `getDiasAtivosNoMes(admissao, desligamento, mesAno): number`
  - `aplicarFerias(diasAtivos, feriasInicio, feriasFim, mesAno): number`
  - `calcularDiasVale710711(...)`, `calcularDiasValeParkshopping(...)` — aplicam proporção ou folgas manuais, e (Parkshopping) subtraem domingos.
  - `calcularValeFuncionario(employee, ajuste, mesAno, unidade): ValeCalculado`
- **Serviço** (`src/services/valesService.ts`): `fetchValesFromSheets(unidade)`, `syncValesToSheets(unidade, mesAno, registros)`, seguindo o mesmo padrão de `sheetsService.ts`.
- **Navegação**: novo estado em `App.tsx` (`view: 'funcionarios' | 'vales'`), controlado por um botão novo no `Header`.
- **Componente `ValesView`** (`src/components/ValesView.tsx`): sub-abas 710/711 e Parkshopping, seletor de mês (`<input type="month">`), tabela com nome/cargo/PIX/dias/valor-dia/total, edição inline do `valorValeDia`, botão para abrir um modal de ajustes (folgas do mês + férias) por funcionário, botão exportar CSV do mês, botão sincronizar com a planilha.
- **Modal `ValeAjusteModal.tsx`**: mini-calendário do mês selecionado para marcar/desmarcar folgas específicas, e campos de data início/fim de férias.
- **Persistência local**: ajustes (`ValeAjuste[]`) e snapshots calculados ficam em `localStorage` (mesmo padrão de `STORAGE_KEY` já usado para funcionários) até sincronizar; sync explícito grava na planilha.

## Fora de escopo

- Cálculo de férias/décimo terceiro/rescisão trabalhista (isso é vale, não folha de pagamento).
- Edição de escala de trabalho dinâmica (dias de folga fixos por pessoa, além do ajuste manual mês a mês já coberto).
- Integração de pagamento (PIX automático) — a tela apenas exibe/exporta os dados para pagamento manual.
