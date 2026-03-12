export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '-';
  return `$${n.toFixed(2)}`;
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(1)}%`;
}
