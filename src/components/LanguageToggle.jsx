import { LANGUAGES, useLanguage } from "../context/LanguageContext";

// Compact EN / GE segmented switch (login screens, account menu).
export default function LanguageToggle({ className = "" }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div role="radiogroup" aria-label={t("account.language")} className={`inline-flex rounded-full bg-hx-btn p-0.5 ${className}`}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={lang === l.code}
          title={l.label}
          onClick={(e) => {
            e.stopPropagation();
            setLang(l.code);
          }}
          className={`h-7 px-2.5 rounded-full text-[13px] font-semibold transition-colors ${
            lang === l.code ? "bg-hx-accent text-white" : "text-hx-text2 hover:text-hx-text"
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
