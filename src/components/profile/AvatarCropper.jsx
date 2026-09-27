import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon";
import { useLanguage } from "../../context/LanguageContext";

const VIEW = 300; // on-screen crop square, CSS px
const OUTPUT = 512; // exported avatar size, px
const MAX_ZOOM = 4;

// Draws the image into a square `size`x`size` canvas context with the current
// edits. Used for both the live preview and the exported file, so what you
// see is exactly what gets uploaded. `pan` is in VIEW px.
function draw(ctx, img, size, { zoom, rotation, flipX, flipY, pan }) {
  const k = size / VIEW;
  const turned = rotation % 180 !== 0;
  const w = turned ? img.naturalHeight : img.naturalWidth;
  const h = turned ? img.naturalWidth : img.naturalHeight;
  const base = Math.max(VIEW / w, VIEW / h); // "cover" the square at zoom 1
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.translate(size / 2 + pan.x * k, size / 2 + pan.y * k);
  // Flip first so it mirrors along the screen's axes, not the rotated image's.
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(base * zoom * k, base * zoom * k);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
}

// Keeps the image covering the whole crop square.
function clampPan(img, { zoom, rotation }, pan) {
  const turned = rotation % 180 !== 0;
  const w = turned ? img.naturalHeight : img.naturalWidth;
  const h = turned ? img.naturalWidth : img.naturalHeight;
  const base = Math.max(VIEW / w, VIEW / h);
  const maxX = Math.max(0, (w * base * zoom - VIEW) / 2);
  const maxY = Math.max(0, (h * base * zoom - VIEW) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, pan.x)), y: Math.min(maxY, Math.max(-maxY, pan.y)) };
}

const INITIAL = { zoom: 1, rotation: 0, flipX: false, flipY: false, pan: { x: 0, y: 0 } };

// "Update profile picture" editor: drag to position, zoom slider, rotate
// 90° left/right, flip horizontal/vertical, circle or square preview.
// onSave(file) receives a 512x512 JPEG of the result.
export default function AvatarCropper({ file, saving, onSave, onClose }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [img, setImg] = useState(null);
  const [failed, setFailed] = useState(false);
  const [edit, setEdit] = useState(INITIAL);
  const [shape, setShape] = useState("circle");

  useEffect(() => {
    // Ignore callbacks from a cleaned-up run: revoking its URL makes the
    // image fail (StrictMode runs this effect twice in development).
    let active = true;
    const url = URL.createObjectURL(file);
    const image = new Image();
    setImg(null);
    setFailed(false);
    image.onload = () => active && setImg(image);
    image.onerror = () => active && setFailed(true);
    image.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Redraw the preview (crisp on high-DPI screens).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;
    draw(canvas.getContext("2d"), img, VIEW * dpr, edit);
  }, [img, edit]);

  const update = useCallback(
    (patch) =>
      setEdit((prev) => {
        const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
        return img ? { ...next, pan: clampPan(img, next, next.pan) } : next;
      }),
    [img]
  );

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  // Under a single mirror a stored rotation turns the other way on screen,
  // so flip the step to keep "rotate right" turning right.
  const rotate = (dir) => update((p) => ({ rotation: (p.rotation + 360 + dir * 90 * (p.flipX !== p.flipY ? -1 : 1)) % 360 }));

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, pan: edit.pan };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    // The square may be rendered smaller than VIEW on narrow screens.
    const s = VIEW / e.currentTarget.getBoundingClientRect().width;
    update({ pan: { x: d.pan.x + (e.clientX - d.x) * s, y: d.pan.y + (e.clientY - d.y) * s } });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const save = () => {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = OUTPUT;
    out.height = OUTPUT;
    draw(out.getContext("2d"), img, OUTPUT, edit);
    out.toBlob(
      (blob) => blob && onSave(new File([blob], "avatar.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.92
    );
  };

  const toolBtn = "hx-btn h-auto min-h-9 py-1.5 px-3 leading-tight text-center bg-hx-btn text-hx-text hover:bg-hx-btnh aria-pressed:bg-hx-accent-soft aria-pressed:text-hx-accent";

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("cropper.title")}
        className="w-[520px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card text-hx-text rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("cropper.title")}</div>
          <button onClick={onClose} disabled={saving} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          {failed ? (
            <p className="text-red-500 py-10">{t("cropper.loadFailed")}</p>
          ) : (
            <div className="relative select-none touch-none" style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}>
              <canvas
                ref={canvasRef}
                aria-label={t("cropper.dragHint")}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="w-full h-full rounded-md cursor-grab active:cursor-grabbing bg-hx-input"
              />
              {/* crop frame: darken outside the circle/square */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: shape === "circle" ? "50%" : "6px",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.9)",
                }}
              />
              {!img && <div className="absolute inset-0 flex items-center justify-center text-hx-text2">{t("common.loading")}</div>}
            </div>
          )}
          <p className="text-[13px] text-hx-text2 -mt-1">{t("cropper.dragHint")}</p>

          <label className="w-full flex items-center gap-3">
            <Icon name="minus" size={18} />
            <input
              type="range"
              min="1"
              max={MAX_ZOOM}
              step="0.01"
              value={edit.zoom}
              onChange={(e) => update({ zoom: Number(e.target.value) })}
              aria-label={t("cropper.zoom")}
              className="flex-1 accent-[rgb(var(--accent))]"
            />
            <Icon name="plus" size={18} />
          </label>

          <div className="w-full grid grid-cols-2 gap-2">
            <button type="button" onClick={() => rotate(-1)} className={toolBtn}>
              <span className="inline-block -scale-x-100">↻</span> {t("cropper.rotateLeft")}
            </button>
            <button type="button" onClick={() => rotate(1)} className={toolBtn}>
              ↻ {t("cropper.rotateRight")}
            </button>
            <button type="button" aria-pressed={edit.flipX} onClick={() => update((p) => ({ flipX: !p.flipX }))} className={toolBtn}>
              ⇆ {t("cropper.flipH")}
            </button>
            <button type="button" aria-pressed={edit.flipY} onClick={() => update((p) => ({ flipY: !p.flipY }))} className={toolBtn}>
              ⇅ {t("cropper.flipV")}
            </button>
          </div>

          <div className="w-full flex items-center justify-between gap-2 flex-wrap">
            <div role="radiogroup" aria-label={t("cropper.preview")} className="inline-flex rounded-full bg-hx-btn p-0.5">
              {["circle", "square"].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={shape === s}
                  onClick={() => setShape(s)}
                  className={`h-8 px-3 rounded-full text-[13px] font-semibold ${shape === s ? "bg-hx-accent text-white" : "text-hx-text2"}`}
                >
                  {t(`cropper.${s}`)}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setEdit(INITIAL)} className="text-hx-accent text-[15px] font-semibold hover:underline">
              {t("cropper.reset")}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-hx-border">
          <button onClick={onClose} disabled={saving} className="hx-btn px-4 text-hx-accent hover:bg-hx-hover">
            {t("common.cancel")}
          </button>
          <button onClick={save} disabled={!img || saving} className="hx-btn px-6 bg-hx-accent text-white hover:brightness-95">
            {saving ? t("common.saving") : t("common.saveShort")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
