export function formatCPF(value: string): string {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
  return digitsOnly
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Converte qualquer formato de data (YYYY-MM-DD, DD/MM/YYYY, ISO String) para o formato brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateString?: string): string {
  if (!dateString) return '-';
  const clean = String(dateString).trim();
  if (!clean) return '-';

  // Se já está no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // Se está no formato YYYY-MM-DD ou contém YYYY-MM-DDTHH...
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Se veio como Date parseável
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return clean;
}

/**
 * Converte data em formato brasileiro (DD/MM/AAAA) ou ISO para o valor de input date (YYYY-MM-DD)
 */
export function dateToInputFormat(dateString?: string): string {
  if (!dateString) return '';
  const clean = String(dateString).trim();
  if (!clean) return '';

  // Se já é YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Se é DD/MM/AAAA
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }

  // Se é ISO
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return '';
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Detecta inteligentemente o tipo da chave PIX caso venha ausente ou nulo do Google Sheets
 */
export function detectPixType(
  chavePix?: string,
  providedType?: string
): 'CPF' | 'Email' | 'Telefone' | 'Aleatória' {
  if (providedType === 'Email' || providedType === 'Telefone' || providedType === 'Aleatória' || providedType === 'CPF') {
    return providedType;
  }

  const clean = String(chavePix || '').trim();
  if (!clean || clean === '-') {
    return 'CPF';
  }

  // Se contiver @ -> Email
  if (clean.includes('@')) {
    return 'Email';
  }

  // Se for formato UUID ou chave aleatória (contém letras e números misturados sem @)
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean);
  if (isUuid || (clean.length >= 25 && /[a-zA-Z]/.test(clean) && /\d/.test(clean))) {
    return 'Aleatória';
  }

  const digitsOnly = clean.replace(/\D/g, '');

  // Se tiver formato explícito de telefone com parênteses, +55 ou 10 dígitos (DDD + 8 dígitos)
  if (clean.startsWith('+') || clean.includes('(') || clean.includes(')') || digitsOnly.length === 10) {
    return 'Telefone';
  }

  // Se tiver 11 dígitos começando com DDD comum e 9 (celular BR) sem pontuação de CPF
  if (digitsOnly.length === 11 && !clean.includes('.')) {
    // Se o terceiro dígito for 9 (DDD + 9XXXXXXXX), é telefone celular
    if (digitsOnly[2] === '9') {
      return 'Telefone';
    }
  }

  // Se tiver letras -> Aleatória
  if (/[a-zA-Z]/.test(clean)) {
    return 'Aleatória';
  }

  // Padrão CPF
  return 'CPF';
}

export interface ProbationPeriodInfo {
  status: 'active' | 'last_day' | 'completed' | 'invalid';
  daysRemaining: number;
  totalDays: number;
  endDateBR: string;
  label: string;
}

/**
 * Calcula o período de experiência de 90 dias com base na data de admissão
 */
export function calculateProbationPeriod(admissaoDateString?: string, totalDays = 90): ProbationPeriodInfo | null {
  if (!admissaoDateString) return null;
  const clean = String(admissaoDateString).trim();
  if (!clean || clean === '-') return null;

  let admDate: Date | null = null;

  // DD/MM/AAAA
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    admDate = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    // YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      admDate = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        admDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }
  }

  if (!admDate || isNaN(admDate.getTime())) {
    return null;
  }

  // Data final do teste (admissão + 90 dias)
  const endDate = new Date(admDate);
  endDate.setDate(endDate.getDate() + totalDays);

  const endDay = String(endDate.getDate()).padStart(2, '0');
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
  const endYear = endDate.getFullYear();
  const endDateBR = `${endDay}/${endMonth}/${endYear}`;

  // Data atual zerada em horas para cálculo preciso de dias corridos
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((endMidnight.getTime() - todayMidnight.getTime()) / msPerDay);

  if (diffDays > 1) {
    return {
      status: 'active',
      daysRemaining: diffDays,
      totalDays,
      endDateBR,
      label: `Faltam ${diffDays} dias de teste (90d)`,
    };
  } else if (diffDays === 1) {
    return {
      status: 'active',
      daysRemaining: 1,
      totalDays,
      endDateBR,
      label: 'Falta 1 dia de teste (90d)',
    };
  } else if (diffDays === 0) {
    return {
      status: 'last_day',
      daysRemaining: 0,
      totalDays,
      endDateBR,
      label: 'Último dia de teste (90d)',
    };
  } else {
    return {
      status: 'completed',
      daysRemaining: 0,
      totalDays,
      endDateBR,
      label: 'Teste concluído (90d)',
    };
  }
}

