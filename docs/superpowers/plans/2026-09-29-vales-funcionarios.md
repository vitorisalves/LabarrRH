# Vales de Funcionários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Vales" screen that calculates monthly employee vouchers (vale) per unit (710/711 5x2, Parkshopping 6x1), with per-employee day-rate, manual day-off/vacation overrides, CSV export, and sync to two new Google Sheets tabs.

**Architecture:** Pure calculation functions in `src/utils/valeCalculations.ts` (unit-tested with Vitest) consume `Employee` + a `ValeAjuste` override record to produce `ValeCalculado` rows for a given `mesAno`. A new `ValesView` screen (reachable via a Header toggle) renders these per unit/month, persists ajustes to localStorage, and syncs snapshots to the spreadsheet through new Apps Script actions mirroring the existing `sheetsService.ts` pattern. Visual style matches the existing dark glassmorphism / indigo-accent Tailwind design (see `Header.tsx`, `TabNav.tsx`).

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, lucide-react icons, Google Apps Script backend, Vitest (new, for pure calc functions only).

**Spec:** `docs/superpowers/specs/2026-09-29-vales-funcionarios-design.md`

## Global Constraints

- No global day-rate value anywhere — every employee (both units) has an individual, editable, persisted `valorValeDia`.
- 710/711: vale days = active days in month × 5/7 (rounded), unless manual folgas are set for that employee/month, in which case use (active days − folgas) exactly.
- Parkshopping: same as above with 6/7, then always subtract Sundays falling within the active-days window (Sunday never generates vale, even with manual folgas).
- Saturday always counts normally toward vale in both units.
- Férias (vacation) date range always removes those days from the active-days window first, in both units, regardless of folgas/proportion.
- Visual style must match the existing app: dark background (`bg-slate-950`/glass panels), indigo/emerald accents, lucide-react icons, same button/badge conventions as `Header.tsx` and `TabNav.tsx`.
- Sheets sync must not break the existing employee sync contract (`doGet`/`doPost` default behavior unchanged when no `action` param is passed).

---

## Task 1: Vitest setup + pure vale calculation functions

**Files:**
- Modify: `package.json` (add `vitest` devDependency + `"test": "vitest run"` script)
- Create: `vitest.config.ts`
- Create: `src/utils/valeCalculations.ts`
- Test: `src/utils/valeCalculations.test.ts`

**Interfaces:**
- Produces:
  - `getDiasAtivosNoMes(admissao: string, desligamento: string | undefined, mesAno: string): { inicio: Date; fim: Date; totalDias: number }` — `admissao`/`desligamento` are `DD/MM/AAAA` (as stored on `Employee`), `mesAno` is `YYYY-MM`. Returns the clipped active window for that month (empty window → `totalDias: 0`).
  - `removerFerias(janela: { inicio: Date; fim: Date; totalDias: number }, feriasInicio: string | undefined, feriasFim: string | undefined, mesAno: string): number` — returns remaining day count after removing vacation days that fall in both the window and the month. Vacation dates are `YYYY-MM-DD`.
  - `calcularDiasVale(params: { diasRestantes: number; janela: { inicio: Date; fim: Date }; mesAno: string; proporcao: 5 | 6; folgasManuais?: number[]; excluirDomingos?: boolean }): number` — `folgasManuais` is a list of day-of-month integers (1-31). When present (non-empty), returns `diasRestantes - folgasManuais.length` (floored at 0). Otherwise returns `Math.round(diasRestantes * proporcao / 7)`. When `excluirDomingos` is true, additionally subtracts the count of Sundays whose date falls inside `janela` (clipped to the month), regardless of which branch was used.
  - `calcularValeFuncionario(employee: { admissao: string; desligamento?: string; valorValeDia?: number }, unidade: '710_711' | 'parkshopping', mesAno: string, ajuste?: { folgasManuais?: number[]; feriasInicio?: string; feriasFim?: string }): { diasVale: number; valorDia: number; valorTotal: number }` — orchestrates the three functions above per the unit's proportion/Sunday rule.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

Add to `package.json` scripts (alongside existing `dev`/`build`/etc.):

```json
"test": "vitest run"
```

- [ ] **Step 3: Write failing tests for `getDiasAtivosNoMes`**

Create `src/utils/valeCalculations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDiasAtivosNoMes, removerFerias, calcularDiasVale, calcularValeFuncionario } from './valeCalculations';

describe('getDiasAtivosNoMes', () => {
  it('returns full month when admissao is before the month and no desligamento', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(janela.totalDias).toBe(30);
  });

  it('clips to admission date when hired mid-month', () => {
    const janela = getDiasAtivosNoMes('15/09/2026', undefined, '2026-09');
    // 15..30 inclusive = 16 days
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `valeCalculations.ts` does not exist yet.

- [ ] **Step 5: Implement `getDiasAtivosNoMes`**

Create `src/utils/valeCalculations.ts`:

```typescript
function parseBRDate(value?: string): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function parseISODate(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

export interface JanelaAtiva {
  inicio: Date;
  fim: Date;
  totalDias: number;
}

export function getDiasAtivosNoMes(
  admissao: string,
  desligamento: string | undefined,
  mesAno: string
): JanelaAtiva {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0); // last day of month

  const admissaoDate = parseBRDate(admissao);
  const desligamentoDate = parseBRDate(desligamento);

  const inicio = admissaoDate && admissaoDate > inicioMes ? admissaoDate : inicioMes;
  const fim = desligamentoDate && desligamentoDate < fimMes ? desligamentoDate : fimMes;

  if (inicio > fim) {
    return { inicio, fim, totalDias: 0 };
  }

  const totalDias = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
  return { inicio, fim, totalDias };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS for all 4 `getDiasAtivosNoMes` tests.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/utils/valeCalculations.ts src/utils/valeCalculations.test.ts
git commit -m "test: add getDiasAtivosNoMes for vale window calculation"
```

- [ ] **Step 8: Write failing tests for `removerFerias`**

Append to `src/utils/valeCalculations.test.ts`:

```typescript
describe('removerFerias', () => {
  it('returns totalDias unchanged when no ferias set', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    expect(removerFerias(janela, undefined, undefined, '2026-09')).toBe(30);
  });

  it('subtracts vacation days that fall inside the month and window', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // 10 days off: Sep 5 through Sep 14 inclusive
    expect(removerFerias(janela, '2026-09-05', '2026-09-14', '2026-09')).toBe(20);
  });

  it('clips vacation range to the month boundaries', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    // Vacation spans Aug 25 - Sep 05: only Sep 1-5 (5 days) count
    expect(removerFerias(janela, '2026-08-25', '2026-09-05', '2026-09')).toBe(25);
  });
});
```

- [ ] **Step 9: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `removerFerias` not defined.

- [ ] **Step 10: Implement `removerFerias`**

Append to `src/utils/valeCalculations.ts`:

```typescript
export function removerFerias(
  janela: JanelaAtiva,
  feriasInicio: string | undefined,
  feriasFim: string | undefined,
  mesAno: string
): number {
  if (janela.totalDias === 0) return 0;

  const feriasInicioDate = parseISODate(feriasInicio);
  const feriasFimDate = parseISODate(feriasFim);
  if (!feriasInicioDate || !feriasFimDate) return janela.totalDias;

  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const inicioCorte = feriasInicioDate < inicioMes ? inicioMes : feriasInicioDate;
  const fimCorte = feriasFimDate > fimMes ? fimMes : feriasFimDate;

  const inicioSobreposicao = inicioCorte < janela.inicio ? janela.inicio : inicioCorte;
  const fimSobreposicao = fimCorte > janela.fim ? janela.fim : fimCorte;

  if (inicioSobreposicao > fimSobreposicao) {
    return janela.totalDias;
  }

  const diasFerias = Math.round((fimSobreposicao.getTime() - inicioSobreposicao.getTime()) / 86400000) + 1;
  return Math.max(0, janela.totalDias - diasFerias);
}
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS for all `removerFerias` tests (previous tests still pass too).

- [ ] **Step 12: Commit**

```bash
git add src/utils/valeCalculations.ts src/utils/valeCalculations.test.ts
git commit -m "test: add removerFerias for vacation day deduction"
```

- [ ] **Step 13: Write failing tests for `calcularDiasVale`**

Append to `src/utils/valeCalculations.test.ts`:

```typescript
describe('calcularDiasVale', () => {
  it('applies 5/7 proportion for 710/711 with no manual folgas', () => {
    const janela = getDiasAtivosNoMes('01/01/2020', undefined, '2026-09');
    const dias = calcularDiasVale({ diasRestantes: 30, janela, mesAno: '2026-09', proporcao: 5 });
    expect(dias).toBe(Math.round((30 * 5) / 7)); // 21
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
    // September 2026 has 5 Sundays (6, 13, 20, 27) -> actually 4 Sundays
    const dias = calcularDiasVale({
      diasRestantes: 30,
      janela,
      mesAno: '2026-09',
      proporcao: 6,
      excluirDomingos: true,
    });
    const proporcional = Math.round((30 * 6) / 7); // 26
    expect(dias).toBe(proporcional - 4); // 4 Sundays in Sep 2026
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
    expect(dias).toBe(30 - 1 - 4);
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
```

- [ ] **Step 14: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `calcularDiasVale` not defined.

- [ ] **Step 15: Implement `calcularDiasVale`**

Append to `src/utils/valeCalculations.ts`:

```typescript
function contarDomingos(janela: JanelaAtiva, mesAno: string): number {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const inicio = janela.inicio < inicioMes ? inicioMes : janela.inicio;
  const fim = janela.fim > fimMes ? fimMes : janela.fim;

  let count = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) count++;
  }
  return count;
}

export function calcularDiasVale(params: {
  diasRestantes: number;
  janela: JanelaAtiva;
  mesAno: string;
  proporcao: 5 | 6;
  folgasManuais?: number[];
  excluirDomingos?: boolean;
}): number {
  const { diasRestantes, janela, mesAno, proporcao, folgasManuais, excluirDomingos } = params;

  let dias: number;
  if (folgasManuais && folgasManuais.length > 0) {
    dias = diasRestantes - folgasManuais.length;
  } else {
    dias = Math.round((diasRestantes * proporcao) / 7);
  }

  if (excluirDomingos) {
    dias -= contarDomingos(janela, mesAno);
  }

  return Math.max(0, dias);
}
```

- [ ] **Step 16: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS for all `calcularDiasVale` tests.

- [ ] **Step 17: Commit**

```bash
git add src/utils/valeCalculations.ts src/utils/valeCalculations.test.ts
git commit -m "test: add calcularDiasVale proportion/folgas/domingo logic"
```

- [ ] **Step 18: Write failing test for `calcularValeFuncionario` orchestration**

Append to `src/utils/valeCalculations.test.ts`:

```typescript
describe('calcularValeFuncionario', () => {
  it('orchestrates window + ferias + proportion for 710_711', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorValeDia: 20 },
      '710_711',
      '2026-09'
    );
    expect(result.diasVale).toBe(21); // 30 * 5/7 rounded
    expect(result.valorDia).toBe(20);
    expect(result.valorTotal).toBe(420);
  });

  it('orchestrates window + proportion + Sunday exclusion for parkshopping', () => {
    const result = calcularValeFuncionario(
      { admissao: '01/01/2020', valorValeDia: 15 },
      'parkshopping',
      '2026-09'
    );
    const expectedDias = Math.round((30 * 6) / 7) - 4;
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
```

- [ ] **Step 19: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `calcularValeFuncionario` not defined.

- [ ] **Step 20: Implement `calcularValeFuncionario`**

Append to `src/utils/valeCalculations.ts`:

```typescript
export interface ValeAjuste {
  folgasManuais?: number[];
  feriasInicio?: string;
  feriasFim?: string;
}

export interface ValeResultado {
  diasVale: number;
  valorDia: number;
  valorTotal: number;
}

export function calcularValeFuncionario(
  employee: { admissao: string; desligamento?: string; valorValeDia?: number },
  unidade: '710_711' | 'parkshopping',
  mesAno: string,
  ajuste?: ValeAjuste
): ValeResultado {
  const janela = getDiasAtivosNoMes(employee.admissao, employee.desligamento, mesAno);
  const diasRestantes = removerFerias(janela, ajuste?.feriasInicio, ajuste?.feriasFim, mesAno);

  const diasVale = calcularDiasVale({
    diasRestantes,
    janela,
    mesAno,
    proporcao: unidade === '710_711' ? 5 : 6,
    folgasManuais: ajuste?.folgasManuais,
    excluirDomingos: unidade === 'parkshopping',
  });

  const valorDia = employee.valorValeDia || 0;
  return { diasVale, valorDia, valorTotal: diasVale * valorDia };
}
```

- [ ] **Step 21: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — all tests in `valeCalculations.test.ts` green.

- [ ] **Step 22: Commit**

```bash
git add src/utils/valeCalculations.ts src/utils/valeCalculations.test.ts
git commit -m "feat: add calcularValeFuncionario orchestration for vale calculation"
```

---

## Task 2: Extend `Employee` type + Apps Script for `valorValeDia`

**Files:**
- Modify: `src/types.ts`
- Modify: `google-apps-script.js:8-35` (HEADERS), `:93-192` (doGet), `:194-265` (doPost)
- Modify: `src/services/sheetsService.ts`

**Interfaces:**
- Consumes: none (leaf data model change).
- Produces: `Employee.valorValeDia?: number` available to every later task; Apps Script reads/writes a `Valor Vale/Dia` column on the `710/711` and `Parkshopping` sheet tabs (harmless empty column on `Freela`/`Inativo`, since the header/mapping is shared across all 4 tabs already).

- [ ] **Step 1: Add `valorValeDia` to the `Employee` type**

In `src/types.ts`, add the field to the `Employee` interface (after `cargo`):

```typescript
  cargo?: string;
  valorValeDia?: number;
```

- [ ] **Step 2: Add the column to Apps Script `HEADERS`**

In `google-apps-script.js`, add `'Valor Vale/Dia'` to the `HEADERS` array (after `'Cargo'`):

```javascript
const HEADERS = [
  'ID',
  'Nome',
  'CPF',
  'Endereço',
  'CEP',
  'Data de Nascimento',
  'Data de Admissão',
  'Cargo',
  'Valor Vale/Dia',
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
```

- [ ] **Step 3: Read the column in `doGet`**

In `google-apps-script.js`, inside the `doGet` row-mapping loop, add after the `cargo` line (around line 159):

```javascript
        const valorValeDia = getVal(['Valor Vale/Dia', 'valorValeDia', 'Valor Vale Dia']);
```

And add it to the pushed object (after `cargo: cargo,` around line 169):

```javascript
          cargo: cargo,
          valorValeDia: valorValeDia ? Number(valorValeDia.replace(',', '.')) : 0,
```

- [ ] **Step 4: Write the column in `doPost`**

In `google-apps-script.js`, inside `doPost`'s `rows` mapping (around line 228-248), add after `emp.cargo || '',`:

```javascript
          emp.cargo || '',
          emp.valorValeDia || '',
```

- [ ] **Step 5: Update `sheetsService.ts` mapping**

In `src/services/sheetsService.ts`, inside `fetchEmployeesFromSheets`'s `.map()` (after the `rawCargo` line, around line 31), add:

```typescript
          const rawValorValeDia = item.valorValeDia ?? item['Valor Vale/Dia'] ?? 0;
```

And add to the returned object (after `cargo: rawCargo,`):

```typescript
            cargo: rawCargo,
            valorValeDia: typeof rawValorValeDia === 'number' ? rawValorValeDia : Number(rawValorValeDia) || 0,
```

In `syncEmployeesToSheets`'s `formattedEmployees` map (around line 70), add:

```typescript
    valorValeDia: emp.valorValeDia || 0,
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (if not already running), open http://localhost:3000, open browser devtools console, run:

```javascript
fetch('https://script.google.com/macros/s/AKfycbz0EZ0jPYg9yGPvZfPLgNWnvptl8FbDDatCrbXQ-Fg_g0upXUcefsxAiC7GhpD3kgi3uw/exec').then(r => r.json()).then(d => console.log(d[0]))
```

Expected: object includes `valorValeDia: 0` (column doesn't exist yet in the sheet, so it defaults to 0 — this confirms the frontend mapping doesn't crash). This step does NOT require pasting the updated Apps Script into the live sheet yet (that happens once, manually, by the user per Task 6's note) — it only verifies the frontend tolerates the missing column.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/services/sheetsService.ts google-apps-script.js
git commit -m "feat: add per-employee valorValeDia field (frontend + Apps Script)"
```

---

## Task 3: Vale types + ajustes/vales localStorage service

**Files:**
- Create: `src/types/vale.ts`
- Create: `src/services/valesLocalStore.ts`

**Interfaces:**
- Consumes: `ValeAjuste` from `src/utils/valeCalculations.ts` (Task 1).
- Produces:
  - `VALE_MES_REGEX` (not exported — internal), `MesAno` type alias `string`.
  - `AjusteArmazenado extends ValeAjuste { funcionarioId: string; mesAno: string; unidade: '710_711' | 'parkshopping' }`
  - `getAjuste(funcionarioId: string, unidade: string, mesAno: string): AjusteArmazenado | undefined`
  - `saveAjuste(ajuste: AjusteArmazenado): void`
  - `getAllAjustesForMonth(unidade: string, mesAno: string): AjusteArmazenado[]`
  - `saveValorValeDiaLocal` is NOT needed — `valorValeDia` lives on `Employee`, persisted via the existing employee sync flow (Task 2), not here.

- [ ] **Step 1: Create the vale types file**

Create `src/types/vale.ts`:

```typescript
export type UnidadeVale = '710_711' | 'parkshopping';

export interface AjusteArmazenado {
  funcionarioId: string;
  unidade: UnidadeVale;
  mesAno: string; // 'YYYY-MM'
  folgasManuais?: number[];
  feriasInicio?: string; // 'YYYY-MM-DD'
  feriasFim?: string; // 'YYYY-MM-DD'
}

export interface ValeCalculado {
  funcionarioId: string;
  nome: string;
  cargo?: string;
  chavePix: string;
  diasVale: number;
  valorDia: number;
  valorTotal: number;
}
```

- [ ] **Step 2: Create the localStorage service**

Create `src/services/valesLocalStore.ts`:

```typescript
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
```

- [ ] **Step 3: Manual verification**

Run: `npx tsc --noEmit` (uses the existing `lint` script logic).
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/vale.ts src/services/valesLocalStore.ts
git commit -m "feat: add vale types and localStorage-backed ajuste store"
```

---

## Task 4: Vales Apps Script actions + `valesService.ts`

**Files:**
- Modify: `google-apps-script.js` (add `VALE_SHEET_TABS`, `VALE_HEADERS`, extend `doGet`/`doPost`)
- Create: `src/services/valesService.ts`

**Interfaces:**
- Consumes: `ValeCalculado` and `AjusteArmazenado` from Task 3.
- Produces:
  - `syncValesToSheets(unidade: '710_711' | 'parkshopping', mesAno: string, registros: Array<ValeCalculado & { folgasManuais?: number[]; feriasInicio?: string; feriasFim?: string }>): Promise<{ status: string; count?: number }>`
  - `fetchValesFromSheets(unidade: '710_711' | 'parkshopping'): Promise<Array<{ funcionarioId: string; mesAno: string; diasVale: number; valorDia: number; valorTotal: number; folgasManuais: number[]; feriasInicio: string; feriasFim: string }>>`

- [ ] **Step 1: Add vale sheet constants to Apps Script**

In `google-apps-script.js`, after `const HEADERS = [...]` block, add:

```javascript
const VALE_SHEET_TABS = {
  '710_711': 'Vale 710_711',
  'parkshopping': 'Vale Parkshopping'
};

const VALE_HEADERS = [
  'FuncionarioId',
  'MesAno',
  'DiasVale',
  'ValorDia',
  'ValorTotal',
  'FolgasManuais',
  'FeriasInicio',
  'FeriasFim',
  'AtualizadoEm'
];
```

- [ ] **Step 2: Route `action=get_vales` in `doGet`**

In `google-apps-script.js`, replace the `function doGet(e) {` line and its opening `try {` with a dispatch that keeps the existing behavior as default:

```javascript
function doGet(e) {
  const action = e.parameter && e.parameter.action;
  if (action === 'get_vales') {
    return handleGetVales(e);
  }
  return handleGetEmployees();
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
      mesAno: String(row[1] || ''),
      diasVale: Number(row[2] || 0),
      valorDia: Number(row[3] || 0),
      valorTotal: Number(row[4] || 0),
      folgasManuais: String(row[5] || '')
        .split(',')
        .filter((v) => v.trim() !== '')
        .map(Number),
      feriasInicio: String(row[6] || ''),
      feriasFim: String(row[7] || ''),
    }));

    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

Then rename the body of the original `doGet` function (everything from the current `try {` through its matching `catch` block) into a new function `handleGetEmployees()` with no parameters — i.e. take the existing try/catch block verbatim and wrap it in `function handleGetEmployees() { ... }` instead of `function doGet(e) { ... }`.

- [ ] **Step 3: Route `action=sync_vales` in `doPost`**

In `google-apps-script.js`, modify `doPost` to dispatch before the existing `sync_all` check:

```javascript
function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);

    if (body.action === 'sync_vales') {
      return handleSyncVales(body);
    }

    if (body.action === 'sync_all' && Array.isArray(body.employees)) {
      // ...existing code unchanged...
```

(Leave everything after that line exactly as-is through the end of the existing `doPost` function.)

Add a new function after `doPost`:

```javascript
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

    // Remove existing rows for this unidade+mesAno (upsert by funcionarioId within mesAno)
    const keptRows = existingRows.filter((row) => String(row[1] || '') !== mesAno);

    const now = new Date().toISOString();
    const newRows = registros.map((r) => [
      r.funcionarioId || '',
      mesAno,
      r.diasVale || 0,
      r.valorDia || 0,
      r.valorTotal || 0,
      (r.folgasManuais || []).join(','),
      r.feriasInicio || '',
      r.feriasFim || '',
      now,
    ]);

    const allRows = keptRows.concat(newRows);

    sheet.clearContents();
    sheet.appendRow(VALE_HEADERS);
    formatHeaderRow(sheet);
    if (allRows.length > 0) {
      sheet.getRange(2, 1, allRows.length, VALE_HEADERS.length).setValues(allRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: registros.length })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

- [ ] **Step 4: Create `valesService.ts`**

Create `src/services/valesService.ts`:

```typescript
import { APPS_SCRIPT_URL } from './sheetsService';
import { UnidadeVale } from '../types/vale';

export interface ValeSheetRow {
  funcionarioId: string;
  mesAno: string;
  diasVale: number;
  valorDia: number;
  valorTotal: number;
  folgasManuais: number[];
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
    diasVale: number;
    valorDia: number;
    valorTotal: number;
    folgasManuais?: number[];
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
```

- [ ] **Step 5: Manual verification**

Run: `npx tsc --noEmit`
Expected: no type errors. (The Apps Script changes can only be verified live once pasted into the Sheet's script editor — flag this to the user after Task 6, since `gh`/`vercel` CLIs don't cover Apps Script deploys.)

- [ ] **Step 6: Commit**

```bash
git add google-apps-script.js src/services/valesService.ts
git commit -m "feat: add vales sync/fetch Apps Script actions and service"
```

---

## Task 5: `ValeAjusteModal` component (folgas + férias picker)

**Files:**
- Create: `src/components/ValeAjusteModal.tsx`

**Interfaces:**
- Consumes: `AjusteArmazenado` type (Task 3).
- Produces: `ValeAjusteModal` React component with props `{ isOpen: boolean; funcionarioNome: string; mesAno: string; ajusteAtual?: { folgasManuais?: number[]; feriasInicio?: string; feriasFim?: string }; onClose: () => void; onSave: (ajuste: { folgasManuais: number[]; feriasInicio?: string; feriasFim?: string }) => void }`.

- [ ] **Step 1: Implement the modal**

Create `src/components/ValeAjusteModal.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { X, CalendarOff, Palmtree } from 'lucide-react';

interface ValeAjusteModalProps {
  isOpen: boolean;
  funcionarioNome: string;
  mesAno: string; // 'YYYY-MM'
  ajusteAtual?: {
    folgasManuais?: number[];
    feriasInicio?: string;
    feriasFim?: string;
  };
  onClose: () => void;
  onSave: (ajuste: { folgasManuais: number[]; feriasInicio?: string; feriasFim?: string }) => void;
}

export const ValeAjusteModal: React.FC<ValeAjusteModalProps> = ({
  isOpen,
  funcionarioNome,
  mesAno,
  ajusteAtual,
  onClose,
  onSave,
}) => {
  const [folgas, setFolgas] = useState<Set<number>>(new Set(ajusteAtual?.folgasManuais || []));
  const [feriasInicio, setFeriasInicio] = useState(ajusteAtual?.feriasInicio || '');
  const [feriasFim, setFeriasFim] = useState(ajusteAtual?.feriasFim || '');

  useEffect(() => {
    setFolgas(new Set(ajusteAtual?.folgasManuais || []));
    setFeriasInicio(ajusteAtual?.feriasInicio || '');
    setFeriasFim(ajusteAtual?.feriasFim || '');
  }, [ajusteAtual, mesAno, isOpen]);

  if (!isOpen) return null;

  const [ano, mes] = mesAno.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  const toggleDia = (dia: number) => {
    const next = new Set(folgas);
    if (next.has(dia)) {
      next.delete(dia);
    } else {
      next.add(dia);
    }
    setFolgas(next);
  };

  const handleSave = () => {
    onSave({
      folgasManuais: Array.from(folgas).sort((a, b) => a - b),
      feriasInicio: feriasInicio || undefined,
      feriasFim: feriasFim || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Ajustes de vale — {funcionarioNome}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300 mb-2">
            <CalendarOff className="w-4 h-4" />
            <span>Folgas manuais do mês</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {dias.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  folgas.has(dia)
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Marcados: {folgas.size > 0 ? Array.from(folgas).sort((a, b) => a - b).join(', ') : 'nenhum'}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <Palmtree className="w-4 h-4" />
            <span>Período de férias</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400">Início</label>
              <input
                type="date"
                value={feriasInicio}
                onChange={(e) => setFeriasInicio(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400">Fim</label>
              <input
                type="date"
                value={feriasFim}
                onChange={(e) => setFeriasFim(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/50 transition-all cursor-pointer"
          >
            Salvar ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Manual verification**

Run: `npx tsc --noEmit`
Expected: no type errors (component isn't wired into the app yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/ValeAjusteModal.tsx
git commit -m "feat: add ValeAjusteModal for manual folgas/ferias entry"
```

---

## Task 6: `ValesView` screen (month picker, table, sub-tabs, export, sync)

**Files:**
- Create: `src/components/ValesView.tsx`

**Interfaces:**
- Consumes: `calcularValeFuncionario` (Task 1), `Employee` (Task 2), `AjusteArmazenado`/`getAjuste`/`saveAjuste`/`getAllAjustesForMonth` (Task 3), `syncValesToSheets` (Task 4), `ValeAjusteModal` (Task 5).
- Produces: `ValesView` component with props `{ employees: Employee[]; onUpdateEmployee: (id: string, valorValeDia: number) => void }`. This is the component `App.tsx` (Task 7) renders when the "Vales" view is active.

- [ ] **Step 1: Implement the view**

Create `src/components/ValesView.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { Building2, Store, Download, RefreshCw, Settings2 } from 'lucide-react';
import { Employee } from '../types';
import { UnidadeVale, ValeCalculado } from '../types/vale';
import { calcularValeFuncionario } from '../utils/valeCalculations';
import { getAjuste, saveAjuste, getAllAjustesForMonth } from '../services/valesLocalStore';
import { syncValesToSheets } from '../services/valesService';
import { ValeAjusteModal } from './ValeAjusteModal';

interface ValesViewProps {
  employees: Employee[];
  onUpdateEmployee: (id: string, valorValeDia: number) => void;
}

function currentMesAno(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const ValesView: React.FC<ValesViewProps> = ({ employees, onUpdateEmployee }) => {
  const [unidade, setUnidade] = useState<UnidadeVale>('710_711');
  const [mesAno, setMesAno] = useState<string>(currentMesAno());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [ajusteModalFuncionario, setAjusteModalFuncionario] = useState<Employee | null>(null);
  const [ajusteVersion, setAjusteVersion] = useState(0); // bump to force recompute after save

  const funcionariosDaUnidade = useMemo(
    () => employees.filter((e) => e.aba === unidade),
    [employees, unidade]
  );

  const linhas: ValeCalculado[] = useMemo(() => {
    return funcionariosDaUnidade.map((emp) => {
      const ajuste = getAjuste(emp.id, unidade, mesAno);
      const resultado = calcularValeFuncionario(
        { admissao: emp.dataAdmissao, desligamento: emp.dataDesligamento, valorValeDia: emp.valorValeDia },
        unidade,
        mesAno,
        ajuste
      );
      return {
        funcionarioId: emp.id,
        nome: emp.nome,
        cargo: emp.cargo,
        chavePix: emp.chavePix,
        diasVale: resultado.diasVale,
        valorDia: resultado.valorDia,
        valorTotal: resultado.valorTotal,
      };
    });
    // ajusteVersion forces recompute when a manual ajuste is saved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionariosDaUnidade, unidade, mesAno, ajusteVersion]);

  const totalGeral = linhas.reduce((sum, l) => sum + l.valorTotal, 0);

  const handleSaveAjuste = (ajuste: { folgasManuais: number[]; feriasInicio?: string; feriasFim?: string }) => {
    if (!ajusteModalFuncionario) return;
    saveAjuste({
      funcionarioId: ajusteModalFuncionario.id,
      unidade,
      mesAno,
      ...ajuste,
    });
    setAjusteVersion((v) => v + 1);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const ajustesDoMes = getAllAjustesForMonth(unidade, mesAno);
      const registros = linhas.map((l) => {
        const ajuste = ajustesDoMes.find((a) => a.funcionarioId === l.funcionarioId);
        return {
          funcionarioId: l.funcionarioId,
          diasVale: l.diasVale,
          valorDia: l.valorDia,
          valorTotal: l.valorTotal,
          folgasManuais: ajuste?.folgasManuais,
          feriasInicio: ajuste?.feriasInicio,
          feriasFim: ajuste?.feriasFim,
        };
      });
      await syncValesToSheets(unidade, mesAno, registros);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Erro ao sincronizar vales:', err);
      setSyncStatus('error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Cargo', 'ChavePix', 'DiasVale', 'ValorDia', 'ValorTotal'];
    const rows = linhas.map((l) => [
      `"${l.nome.replace(/"/g, '""')}"`,
      `"${(l.cargo || '').replace(/"/g, '""')}"`,
      `"${l.chavePix}"`,
      l.diasVale,
      l.valorDia.toFixed(2),
      l.valorTotal.toFixed(2),
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vales_${unidade}_${mesAno}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-2xl">
        <div className="flex gap-2 px-4 sm:px-6 pt-2">
          <button
            onClick={() => setUnidade('710_711')}
            className={`flex items-center gap-2.5 py-3 px-4 font-medium text-sm border-b-2 rounded-t-xl transition-all cursor-pointer ${
              unidade === '710_711'
                ? 'text-emerald-300 border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold backdrop-blur-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>710/711</span>
          </button>
          <button
            onClick={() => setUnidade('parkshopping')}
            className={`flex items-center gap-2.5 py-3 px-4 font-medium text-sm border-b-2 rounded-t-xl transition-all cursor-pointer ${
              unidade === 'parkshopping'
                ? 'text-indigo-300 border-indigo-400/60 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.25)] font-semibold backdrop-blur-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Parkshopping</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/5 backdrop-blur-2xl p-4 border border-white/10 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300 font-medium">Mês:</label>
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <span className="text-sm text-slate-400">
            Total do mês: <span className="text-white font-bold">R$ {totalGeral.toFixed(2)}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl backdrop-blur-md hover:border-white/25 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-300" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar planilha'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-left text-slate-300 font-semibold">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Chave PIX</th>
              <th className="px-4 py-3 text-center">Dias de vale</th>
              <th className="px-4 py-3 text-right">Valor/dia</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Ajustes</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const emp = funcionariosDaUnidade.find((e) => e.id === linha.funcionarioId)!;
              return (
                <tr key={linha.funcionarioId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{linha.nome}</td>
                  <td className="px-4 py-3 text-slate-300">{linha.cargo || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{linha.chavePix || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-200">{linha.diasVale}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={linha.valorDia}
                      onChange={(e) => onUpdateEmployee(linha.funcionarioId, Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 bg-white/5 border border-white/15 rounded-lg text-right text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-300 font-semibold">
                    R$ {linha.valorTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setAjusteModalFuncionario(emp)}
                      title="Marcar folgas/férias deste mês"
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Nenhum funcionário nesta unidade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ajusteModalFuncionario && (
        <ValeAjusteModal
          isOpen={true}
          funcionarioNome={ajusteModalFuncionario.nome}
          mesAno={mesAno}
          ajusteAtual={getAjuste(ajusteModalFuncionario.id, unidade, mesAno)}
          onClose={() => setAjusteModalFuncionario(null)}
          onSave={handleSaveAjuste}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Manual verification**

Run: `npx tsc --noEmit`
Expected: no type errors (still not wired into `App.tsx` yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/ValesView.tsx
git commit -m "feat: add ValesView screen with month picker, table, export and sync"
```

---

## Task 7: Wire "Vales" into `Header` + `App.tsx`

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ValesView` (Task 6).
- Produces: a working toggle between the "Funcionários" and "Vales" screens, reachable from the header.

- [ ] **Step 1: Add a view toggle button to `Header`**

In `src/components/Header.tsx`, add two new props to `HeaderProps`:

```typescript
  view: 'funcionarios' | 'vales';
  onChangeView: (view: 'funcionarios' | 'vales') => void;
```

Destructure them in the component signature, and add `Wallet` to the `lucide-react` import line:

```typescript
import { Users, UserPlus, Search, Download, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
```

Add a toggle button right before the "Search Input" div inside "Action Tools" (after the opening `<div className="flex flex-wrap items-center gap-3">`):

```tsx
            {/* View toggle: Funcionarios / Vales */}
            <button
              onClick={() => onChangeView(view === 'funcionarios' ? 'vales' : 'funcionarios')}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-xs"
            >
              <Wallet className="w-4 h-4 text-indigo-300" />
              <span className="hidden sm:inline">
                {view === 'funcionarios' ? 'Ver Vales' : 'Ver Funcionários'}
              </span>
            </button>
```

- [ ] **Step 2: Add view state and conditional rendering in `App.tsx`**

In `src/App.tsx`, add a new state near the other UI state (after `const [activeTab, ...]`):

```typescript
  const [view, setView] = useState<'funcionarios' | 'vales'>('funcionarios');
```

Add the import for `ValesView` (after the other component imports):

```typescript
import { ValesView } from './components/ValesView';
```

Pass the new props to `<Header>`:

```tsx
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenNewModal={openNewEmployeeModal}
        activeTab={activeTab}
        totalEmployees={activeEmployeesCount}
        employees={employees}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={handleManualSync}
        view={view}
        onChangeView={setView}
      />
```

Wrap the existing `<main>` content (the `TabNav` + table `div`) with a conditional, and render `ValesView` for the `vales` case. Replace the `<main>` block with:

```tsx
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-6 relative z-10">
        {view === 'funcionarios' ? (
          <>
            {/* Navigation Tabs (710/711, Parkshopping, Freela, Inativo) */}
            <TabNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={counts}
            />

            {/* Tab Content Table Container */}
            <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 border border-t-0 border-white/10 rounded-b-2xl shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
                  <span>Exibindo</span>
                  <span className="font-bold text-white px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-sm">
                    {filteredEmployees.length}
                  </span>
                  <span>colaborador(es) na aba</span>
                  <span className="font-bold text-indigo-300 text-sm">
                    {activeTab === '710_711'
                      ? '710/711'
                      : activeTab === 'parkshopping'
                      ? 'Parkshopping'
                      : activeTab === 'freela'
                      ? 'Freela'
                      : 'Inativo'}
                  </span>
                  {searchTerm && <span className="text-slate-400"> (filtro: "{searchTerm}")</span>}
                </div>
              </div>

              <EmployeeTable
                employees={filteredEmployees}
                activeTab={activeTab}
                onViewDetails={openDetailsModal}
                onEdit={openEditModal}
                onTransfer={openTransferModal}
                onDelete={openDeleteModal}
                onNewEmployee={openNewEmployeeModal}
              />
            </div>
          </>
        ) : (
          <ValesView
            employees={employees}
            onUpdateEmployee={(id, valorValeDia) => {
              const updatedList = employees.map((emp) =>
                emp.id === id ? { ...emp, valorValeDia, updatedAt: new Date().toISOString() } : emp
              );
              setEmployees(updatedList);
              triggerSheetsSync(updatedList);
            }}
          />
        )}
      </main>
```

- [ ] **Step 3: Manual verification**

Run: `npx tsc --noEmit`
Expected: no type errors.

Then, with the dev server running (`npm run dev`, already started at http://localhost:3000), verify in a browser:
1. Open http://localhost:3000 — "Funcionários" view loads as before.
2. Click "Ver Vales" in the header — table with 710/711 sub-tab shows employees with dias/valor/total columns.
3. Change the month picker — dias/total recompute.
4. Edit a "Valor/dia" cell — total for that row updates immediately.
5. Click the settings icon on a row — `ValeAjusteModal` opens, mark a day off, save — dias/total recompute for that row.
6. Switch to "Parkshopping" sub-tab — different employee list shown, same interactions work.
7. Click "Ver Funcionários" — returns to the original screen unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/App.tsx
git commit -m "feat: wire Vales view into header navigation and App"
```

---

## Task 8: Run full test suite + type check, note manual Apps Script deploy step

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — all `valeCalculations.test.ts` tests green.

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 3: Verify the dev server still serves the app**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000`
Expected: `200`

- [ ] **Step 4: Tell the user about the one manual step this plan cannot automate**

The updated `google-apps-script.js` (Tasks 2 and 4 changes) only takes effect on the **live** Google Sheet once someone opens the Sheet's Extensions → Apps Script editor, pastes the updated file contents over the existing script, and saves/redeploys the Web App (same URL, so no frontend change needed). No code step in this plan can do that — it requires the user's Google login. State this clearly at the end of the implementation report.
