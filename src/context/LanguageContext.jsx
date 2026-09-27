import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "../i18n/en.json";
import ka from "../i18n/ka.json";

// UI language (English / Georgian). The choice is per device (localStorage).
// t("post.like") looks a key up in the active dictionary, falling back to
// English, then to the key itself. Placeholders: t("feed.whatsOnYourMind",
// { name }). Plurals: t("post.comments", { count }) picks `_one`/`_other`.
//
// Components get `t` from useLanguage(), which also re-renders them when the
// language changes. Plain helpers (timeAgo, formatPrice, reaction names) use
// translate()/locale(), which read the language the provider last rendered -
// they're always called from a component that uses the hook.
export const LANGUAGES = [
  { code: "en", label: "English", short: "EN", locale: "en-US" },
  { code: "ka", label: "ქართული", short: "GE", locale: "ka-GE" },
];
const DICTS = { en, ka };
const STORAGE_KEY = "hx-lang";

const lookup = (dict, key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), dict);

function translateIn(lang, key, vars) {
  const pluralKey = vars && typeof vars.count === "number" ? `${key}_${vars.count === 1 ? "one" : "other"}` : null;
  let text = null;
  for (const dict of [DICTS[lang], en]) {
    text = (pluralKey && lookup(dict, pluralKey)) ?? lookup(dict, key);
    if (typeof text === "string") break;
  }
  if (typeof text !== "string") return key;
  return vars
    ? text.replace(/\{(\w+)\}/g, (m, name) => {
        const v = vars[name];
        if (v == null) return m;
        return typeof v === "number" ? v.toLocaleString(locale()) : v;
      })
    : text;
}

const initialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return DICTS[saved] ? saved : "en";
  } catch {
    return "en";
  }
};

let activeLang = initialLang();

export const translate = (key, vars) => translateIn(activeLang, key, vars);
export const locale = () => LANGUAGES.find((l) => l.code === activeLang)?.locale || "en-US";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => activeLang);
  activeLang = lang;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!DICTS[code]) return;
    activeLang = code;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage unavailable - the choice lasts for this visit only
    }
  }, []);

  const t = useCallback((key, vars) => translateIn(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, locale: LANGUAGES.find((l) => l.code === lang)?.locale || "en-US" }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
