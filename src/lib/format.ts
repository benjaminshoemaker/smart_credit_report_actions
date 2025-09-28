export function currency(value: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...opts,
  }).format(value || 0);
}

export function percent(ratio: number, digits = 0) {
  const n = Number.isFinite(ratio) ? ratio : 0;
  return `${(n * 100).toFixed(digits)}%`;
}

