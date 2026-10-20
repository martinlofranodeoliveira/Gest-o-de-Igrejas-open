function pad(value: number) {
  return String(value).padStart(2, '0');
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function normalizeDateValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    return isValidDateParts(year, month, day) ? raw : '';
  }

  const isoWithTime = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoWithTime) {
    const isoDate = isoWithTime[1];
    const year = Number(isoDate.slice(0, 4));
    const month = Number(isoDate.slice(5, 7));
    const day = Number(isoDate.slice(8, 10));
    return isValidDateParts(year, month, day) ? isoDate : '';
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, dayText, monthText, yearText] = slashDate;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
    return '';
  }

  const dashedDate = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashedDate) {
    const [, dayText, monthText, yearText] = dashedDate;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
    return '';
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function toDate(value: unknown): Date | null {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateLabel(value: unknown) {
  const date = toDate(value);
  if (!date) {
    return '--';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getMonthKey(value: unknown) {
  const date = toDate(value);
  if (!date) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function isDateInCurrentMonth(value: unknown, now = new Date()) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function isBirthdayThisMonth(value: unknown, now = new Date()) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  return date.getMonth() === now.getMonth();
}

export function normalizeCurrencyNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return 0;
  }

  let normalized = raw.replace(/\s+/g, '');

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized =
      normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
}
