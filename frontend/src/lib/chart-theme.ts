/**
 * Palet & helper visual untuk seluruh chart Recharts di aplikasi.
 * Urutan hue kategorikal ini FIXED (tidak boleh diacak) — urutan ini yang
 * menjaga kontras antar warna tetap aman untuk buta warna (CVD-safe).
 * Setiap slot punya pasangan light/dark agar tetap kontras di kedua tema.
 */
export const CHART_CATEGORICAL = [
  { light: '#2a78d6', dark: '#3987e5' }, // 1 biru
  { light: '#1baf7a', dark: '#199e70' }, // 2 aqua
  { light: '#eda100', dark: '#c98500' }, // 3 kuning
  { light: '#008300', dark: '#008300' }, // 4 hijau
  { light: '#4a3aa7', dark: '#9085e9' }, // 5 ungu
  { light: '#e34948', dark: '#e66767' }, // 6 merah
  { light: '#e87ba4', dark: '#d55181' }, // 7 magenta
  { light: '#eb6834', dark: '#d95926' }, // 8 oranye
] as const;

export const CHART_STATUS = {
  good: { light: '#0ca30c', dark: '#0ca30c' },
  warning: { light: '#fab219', dark: '#fab219' },
  serious: { light: '#ec835a', dark: '#ec835a' },
  critical: { light: '#d03b3b', dark: '#d03b3b' },
} as const;

export function categoricalColor(index: number, isDark: boolean): string {
  const slot = CHART_CATEGORICAL[index % CHART_CATEGORICAL.length];
  return isDark ? slot.dark : slot.light;
}

export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0);
}

export function formatCompactRupiah(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `Rp${(val / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000_000) return `Rp${(val / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(val) >= 1_000) return `Rp${(val / 1_000).toFixed(0)}rb`;
  return `Rp${val}`;
}
