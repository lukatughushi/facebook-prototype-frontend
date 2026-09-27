import { useState } from "react";
import resolveImage from "../utils/resolveImage";
import { colorFor, initialsOf } from "../utils/format";

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 128 };

// Shows the user's avatar image, or their initials on a per-person colored
// circle when no avatar has been uploaded yet. `size` is a preset name or a
// pixel number; `rounded` switches to the square-ish tiles used in grids.
export default function Avatar({ src, name = "?", size = "md", rounded = "50%", online = false, className = "", style }) {
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  const box = { width: px, height: px, borderRadius: rounded, flexShrink: 0, ...style };

  // A broken/missing upload falls back to the initials tile.
  const [failed, setFailed] = useState(null);
  const inner = src && failed !== src ? (
    <img src={resolveImage(src)} alt={name} onError={() => setFailed(src)} className={`object-cover bg-hx-input ${className}`} style={box} />
  ) : (
    <div
      className={`flex items-center justify-center text-white font-bold select-none ${className}`}
      style={{ background: colorFor(name), fontSize: Math.max(9, Math.round(px * 0.36)), ...box }}
    >
      {initialsOf(name)}
    </div>
  );

  if (!online) return inner;

  // Design sizes: 12px dot / 2px ring on small avatars, 14px / 3px on 56px ones.
  const big = px >= 48;
  const dot = big ? 14 : 12;
  const edge = big ? 1 : -1;
  return (
    <div className="relative flex-shrink-0" style={{ width: px, height: px }}>
      {inner}
      <span
        className="absolute rounded-full bg-[#31a24c] border-hx-card"
        style={{ right: edge, bottom: edge, width: dot, height: dot, borderWidth: big ? 3 : 2, borderStyle: "solid" }}
      />
    </div>
  );
}
