import { useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

// Cover photo in "reposition" mode: drag up/down to choose which part of the
// photo shows. `position` is the CSS object-position Y in percent (0 = top).
export default function CoverRepositioner({ src, position, onChange }) {
  const { t } = useLanguage();
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // How many px of the photo are hidden vertically with object-fit: cover.
  const overflowY = () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return 0;
    const box = img.getBoundingClientRect();
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    return img.naturalHeight * scale - box.height;
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, position, overflow: overflowY() };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.overflow <= 0) return;
    // Dragging the photo down reveals more of its top (smaller percentage).
    const next = d.position - ((e.clientY - d.y) / d.overflow) * 100;
    onChange(Math.min(100, Math.max(0, next)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onKeyDown = (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    onChange(Math.min(100, Math.max(0, position + (e.key === "ArrowUp" ? -2 : 2))));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t("cover.repositionLabel")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={`absolute inset-0 touch-none select-none outline-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
        style={{ objectPosition: `50% ${position}%` }}
      />
      {!dragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="px-4 py-2 rounded-md bg-black/55 text-white font-semibold text-[15px] flex items-center gap-2">
            ⇅ {t("cover.dragHint")}
          </span>
        </div>
      )}
    </div>
  );
}
