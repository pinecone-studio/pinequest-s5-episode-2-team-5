/** Keep small yields and particle counts legible without rounding nonzero values to zero. */
export function formatMeasurement(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value !== 0 && (Math.abs(value) < .001 || Math.abs(value) >= 1e6)) return value.toExponential(3);
  return String(Number(value.toPrecision(6)));
}
