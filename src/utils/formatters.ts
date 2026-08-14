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

