const DEFAULT_LOCALE = "es-AR";
const DEFAULT_CURRENCY = "ARS";
const DEFAULT_TIME_ZONE = "America/Argentina/Tucuman";
const EMPTY_VALUE = "—";

type DateValue = Date | number | string | null | undefined;

type CurrencyFormatOptions = {
  currency?: string;
  locale?: string;
};

type DateFormatOptions = {
  locale?: string;
  timeZone?: string;
};

function parseDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: options.currency ?? DEFAULT_CURRENCY,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 3,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits,
  }).format(value);
}

export function formatDate(
  value: DateValue,
  options: DateFormatOptions = {},
): string {
  const date = parseDate(value);
  if (!date) {
    return EMPTY_VALUE;
  }

  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(date);
}

export function formatDateTime(
  value: DateValue,
  options: DateFormatOptions = {},
): string {
  const date = parseDate(value);
  if (!date) {
    return EMPTY_VALUE;
  }

  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(date);
}

export function formatPercent(
  value: number | null | undefined,
  maximumFractionDigits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "percent",
    maximumFractionDigits,
  }).format(value / 100);
}
