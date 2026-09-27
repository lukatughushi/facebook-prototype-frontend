import { locale, translate } from "../context/LanguageContext";

// Person colors from the design, used for initials avatars. A name always
// maps to the same color.
const PERSON_COLORS = [
  "oklch(0.6 0.13 250)",
  "oklch(0.62 0.14 20)",
  "oklch(0.6 0.12 160)",
  "oklch(0.65 0.13 70)",
  "oklch(0.56 0.14 300)",
  "oklch(0.6 0.1 200)",
  "oklch(0.58 0.13 340)",
  "oklch(0.55 0.08 120)",
];

export function colorFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

export function initialsOf(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export const firstName = (name = "") => name.split(" ")[0];

// Compact relative time: "Just now", "12m", "3h", "Yesterday at 6:12 PM",
// then "September 14" style dates.
export function timeAgo(date) {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 60) return translate("time.justNow");
  if (seconds < 3600) return translate("time.minutes", { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return translate("time.hours", { n: Math.floor(seconds / 3600) });
  if (seconds < 172800) {
    return translate("time.yesterdayAt", { time: d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" }) });
  }
  if (seconds < 604800) return translate("time.days", { n: Math.floor(seconds / 86400) });
  return d.toLocaleDateString(locale(), { month: "long", day: "numeric" });
}

// Short localized date/time helpers for display.
export const formatDate = (date, options) => new Date(date).toLocaleDateString(locale(), options);
export const formatDateTime = (date, options) => new Date(date).toLocaleString(locale(), options);
export const formatNumber = (n) => Number(n || 0).toLocaleString(locale());

// Marketplace prices: whole dollars, "Free" for 0.
const PRICE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatPrice = (n) => (Number(n) === 0 ? translate("marketplace.free") : PRICE.format(n));
