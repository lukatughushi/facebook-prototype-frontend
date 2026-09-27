import { useEffect, useRef } from "react";
import Icon from "./Icon";

// Small hardcoded emoji set - no external picker library/network call needed.
const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😮", "😡", "🥳",
  "👍", "👎", "❤️", "🔥", "🎉", "👏", "🙌", "🙏", "💯", "✨",
  "😅", "😁", "😊", "😇", "🤩", "😴", "🤯", "😭", "🤗", "😜",
];

// The composer's "Feeling/activity" button and its emoji popover.
export default function EmojiPicker({ open, onToggle, onSelect }) {
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onToggle((o) => !o)}
        title="Feeling/activity"
        className="w-9 h-9 rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer hover:bg-hx-hover"
        style={{ color: "#f5a524" }}
      >
        <Icon name="smile" size={22} />
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
