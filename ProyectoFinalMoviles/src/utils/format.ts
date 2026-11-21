/** "85.5" -> "$85.50". If there is no price it returns a fallback text. */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Sin precio';
  return `$${Number(value).toFixed(2)}`;
}

/** "2026-11-18T20:14:00-06:00" -> "18 nov 2026" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "2026-11-18T20:14:00-06:00" -> "18 nov 2026, 8:14 p.m." */
export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
