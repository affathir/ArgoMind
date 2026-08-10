// =============================================================================
//  AgriMind – Formatting utilities
// =============================================================================
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

/** Format an ISO timestamp as "HH:mm" */
export function fmtTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** Format an ISO timestamp as "dd MMM, HH:mm" in Bahasa Indonesia */
export function fmtDateTime(iso: string): string {
  return format(new Date(iso), "dd MMM, HH:mm", { locale: localeId });
}

/** e.g. "3 menit yang lalu" */
export function fmtRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId });
}

/** Round to 1 decimal place */
export function round1(n: number): string {
  return n.toFixed(1);
}

/** Moisture % → human-readable category (Bahasa Indonesia) */
export function moistureLabel(pct: number): string {
  if (pct >= 60) return "Sangat Lembap";
  if (pct >= 40) return "Lembap";
  if (pct >= 20) return "Kering";
  return "Sangat Kering";
}

/** Join Tailwind class names, filtering falsy values */
export { clsx as cn } from "clsx";
