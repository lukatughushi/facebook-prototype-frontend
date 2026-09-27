import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

// Small hardcoded emoji set - no external picker library/network call needed.
const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😮", "😡", "🥳",
  "👍", "👎", "❤️", "🔥", "🎉", "👏", "🙌", "🙏", "💯", "✨",
  "😅", "😁", "😊", "😇", "🤩", "😴", "🤯", "😭", "🤗", "😜",
];

// Returns `value` with `insert` placed at the caret of input/textarea `el`
// (replacing any selection), then puts the caret right after it. Returns
// `value` unchanged if the result would exceed `maxLength`.
export function insertAtCursor(el, value, insert, maxLength = Infinity) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + insert + value.slice(end);
  if (next.length > maxLength) return value;
  requestAnimationFrame(() => {
    el?.focus();
    el?.setSelectionRange(start + insert.length, start + insert.length);
  });
  return next;
}

// Smiley button with an emoji popover. Controlled via `open`/`onToggle` (the
// post composer opens it from "Feeling/activity"), or self-managed when those
// are omitted (comment and chat inputs). `small` fits it inside a pill input.
export default function EmojiPicker({ open: openProp, onToggle: onToggleProp, onSelect, label = "Feeling/activity", small = false }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const onToggle = onToggleProp ?? setOpenState;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onToggle(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onToggle]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => onToggle((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={`${small ? "w-7 h-7" : "w-9 h-9"} rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer hover:bg-hx-hover`}
        style={{ color: "#f5a524" }}
      >
        <Icon name="smile" size={small ? 18 : 22} />
      </button>

      {open && (
        <div className="panel absolute bottom-full right-0 mb-2 w-64 p-2 z-50">
          <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  onToggle(false);
                }}
                className="text-xl leading-none h-8 w-8 flex items-center justify-center rounded hover:bg-hx-hover transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
