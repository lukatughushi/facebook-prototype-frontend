import { translate } from "../context/LanguageContext";

// Facebook's seven reactions. Emoji art is Twemoji (CC-BY 4.0), served from
// jsDelivr so they look the same on every OS.
export const REACTIONS = [
  { type: "like", emoji: "👍", code: "1f44d", color: "#1877f2" },
  { type: "love", emoji: "❤️", code: "2764", color: "#f33e58" },
  { type: "care", emoji: "🥰", code: "1f970", color: "#f7b125" },
  { type: "haha", emoji: "😆", code: "1f606", color: "#f7b125" },
  { type: "wow", emoji: "😮", code: "1f62e", color: "#f7b125" },
  { type: "sad", emoji: "😢", code: "1f622", color: "#f7b125" },
  { type: "angry", emoji: "😡", code: "1f621", color: "#e9710f" },
];
// `label` follows the UI language.
for (const r of REACTIONS) {
  Object.defineProperty(r, "label", { get: () => translate(`reactions.${r.type}`), enumerable: true });
}

export const REACTION = Object.fromEntries(REACTIONS.map((r) => [r.type, r]));

export const emojiUrl = (code) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;

const idOf = (u) => String(u?._id ?? u);

// Normalizes either a full reactions list ([{ user, type }]) or a counts
// object ({ like: 3 }) into { total, counts, top: [type...], mine }.
export function summarize(source, userId, mineOverride) {
  let counts = {};
  let mine = mineOverride ?? null;
  if (Array.isArray(source)) {
    for (const r of source) {
      counts[r.type] = (counts[r.type] || 0) + 1;
      if (mineOverride === undefined && idOf(r.user) === userId) mine = r.type;
    }
  } else {
    counts = { ...(source || {}) };
  }
  const top = Object.keys(counts)
    .filter((t) => REACTION[t] && counts[t] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 3);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, counts, top, mine };
}

// "You and 12 others" / "You" / "13" - Facebook's reaction count text.
export function reactionText({ total, mine }) {
  if (!total) return "";
  if (!mine) return translate("reactions.count", { n: total });
  return total === 1 ? translate("reactions.you") : translate("reactions.youAndOthers", { count: total - 1 });
}

// Optimistically applies `type` for `userId` to a reactions list (same type
// again removes it) - mirrors the server's rule.
export function toggleInList(list, userId, type) {
  const current = list.find((r) => idOf(r.user) === userId)?.type;
  const others = list.filter((r) => idOf(r.user) !== userId);
  return type && type !== current ? [...others, { user: userId, type }] : others;
}
