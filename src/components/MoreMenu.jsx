import { useState } from "react";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

// Three-dots button with a dropdown of { icon, label, run } items (falsy
// entries are skipped). `buttonClass` restyles the trigger, e.g. for dark
// photo/video backgrounds; `up` opens the menu above the button.
export default function MoreMenu({ items, buttonClass, iconSize = 20, up = false, width = "w-56" }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={t("post.more")}
        aria-expanded={open}
        className={
          buttonClass ||
          "w-9 h-9 rounded-full border-0 bg-transparent text-hx-text2 flex items-center justify-center cursor-pointer hover:bg-hx-hover"
        }
      >
        <Icon name="more" size={iconSize} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[29]"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div role="menu" className={`panel absolute right-0 ${up ? "bottom-11" : "top-10"} ${width} p-2 z-[30] text-left text-hx-text`}>
            {shown.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.run();
                }}
                className="flex items-center gap-3 w-full p-2 rounded-md cursor-pointer font-medium text-left hover:bg-hx-hover"
              >
                <Icon name={item.icon} size={20} /> <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
