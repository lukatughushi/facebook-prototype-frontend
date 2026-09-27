import { useState } from "react";
import { REACTION, emojiUrl } from "../../utils/reactions";

// A reaction emoji as a Twemoji image, falling back to the native glyph if
// the CDN is unreachable.
export default function Emoji({ type, size = 18, className = "", style }) {
  const [failed, setFailed] = useState(false);
  const r = REACTION[type];
  if (!r) return null;
  const box = { width: size, height: size, ...style };
  if (failed) {
    return (
      <span role="img" aria-label={r.label} className={`inline-flex items-center justify-center leading-none ${className}`} style={{ ...box, fontSize: size * 0.85 }}>
        {r.emoji}
      </span>
    );
  }
  return (
    <img
      src={emojiUrl(r.code)}
      alt={r.label}
      draggable={false}
      onError={() => setFailed(true)}
      className={`select-none ${className}`}
      style={{ display: "block", flexShrink: 0, ...box }}
    />
  );
}
