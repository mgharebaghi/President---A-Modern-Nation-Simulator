import type { Language } from './messages';

export function formatDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB-u-ca-gregory', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}
export function formatTime(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-GB', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}
export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-GB', { maximumFractionDigits: 0 }).format(value);
}
