import { useEffect, useRef, useState } from "react";
import { REACTIONS } from "../../utils/reactions";
import Emoji from "./Emoji";
import { useLanguage } from "../../context/LanguageContext";

const OPEN_DELAY = 450;
const CLOSE_DELAY = 300;
const LONG_PRESS = 450;

// Facebook's floating reaction bar. Wraps a trigger (the Like button);
// hovering it for a moment - or long-pressing on touch - pops up the seven
// reactions, which grow and show their name on hover.
//   placement: "top-start" | "top-center" | "left" (reels rail)
//   size: "md" (posts, reels) | "sm" (comments)
export default function ReactionPicker({ onPick, children, placement = "top-start", size = "md", className = "" }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const timer = useRef(null);
  const pressed = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (value, delay) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(value), delay);
  };

  const pick = (type, e) => {
    e.stopPropagation();
    clearTimeout(timer.current);
    setOpen(false);
    setHovered(null);
    onPick(type);
  };

  const px = size === "sm" ? 32 : 40;
  const pos =
    placement === "left"
      ? "right-[calc(100%+8px)] top-1/2 -translate-y-1/2"
      : placement === "top-center"
        ? "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2"
        : "bottom-[calc(100%+6px)] left-0";

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => schedule(true, OPEN_DELAY)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY)}
      onTouchStart={() => {
        pressed.current = false;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          pressed.current = true;
          setOpen(true);
        }, LONG_PRESS);
      }}
      onTouchEnd={(e) => {
        clearTimeout(timer.current);
        // A long press opened the bar; don't let the tap also toggle "Like".
        if (pressed.current) e.preventDefault();
      }}
      onContextMenu={(e) => open && e.preventDefault()}
    >
      {children}
      {open && (
        <div
          role="toolbar"
          aria-label={t("reactions.title")}
          onMouseEnter={() => clearTimeout(timer.current)}
          className={`absolute z-20 ${pos} flex items-center gap-0.5 p-1 bg-hx-card rounded-full shadow-hx-pop animate-[reactBar_.22s_cubic-bezier(.2,.9,.3,1.3)]`}
        >
          {REACTIONS.map((r, i) => (
            <button
              key={r.type}
              type="button"
              aria-label={r.label}
              onClick={(e) => pick(r.type, e)}
              onMouseEnter={() => setHovered(r.type)}
              onMouseLeave={() => setHovered((h) => (h === r.type ? null : h))}
              className="relative flex items-center justify-center rounded-full"
              style={{ width: px, height: px }}
            >
              {hovered === r.type && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none">
                  {r.label}
                </span>
              )}
              <span
                className="transition-transform duration-150 ease-out animate-[reactPop_.3s_ease-out_backwards]"
                style={{
                  animationDelay: `${i * 30}ms`,
                  transform: hovered === r.type ? "scale(1.35) translateY(-4px)" : hovered ? "scale(0.9)" : "none",
                }}
              >
                <Emoji type={r.type} size={px - 6} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
