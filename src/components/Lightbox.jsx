import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import resolveImage from "../utils/resolveImage";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";
import { useReport } from "../context/ReportContext";
import MoreMenu from "./MoreMenu";
import { isReportOpen } from "./ReportModal";

// Full-screen photo viewer. `images` is a list of image paths/URLs (or
// { src, alt } objects); `startIndex` picks the first one shown.
// Keyboard: Esc closes, Left/Right step through (wrapping around).
// `report` ({ contentType, targetId, label }) adds a three-dots menu with Report.
export default function Lightbox({ images, startIndex = 0, onClose, report }) {
  const { t } = useLanguage();
  const openReport = useReport();
  const items = images.map((img) => (typeof img === "string" ? { src: img } : img));
  const total = items.length;
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), total - 1));

  const step = useCallback((delta) => setIndex((i) => (i + delta + total) % total), [total]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isReportOpen()) return; // the report dialog on top handles keys
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && total > 1) step(1);
      else if (e.key === "ArrowLeft" && total > 1) step(-1);
      else return;
      e.preventDefault();
      // Keep Escape from also closing whatever opened the lightbox.
      e.stopImmediatePropagation();
    };
    // Capture phase so the lightbox handles keys before other listeners.
    window.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, step, total]);

  if (total === 0) return null;
  const current = items[index];

  const navBtn =
    "absolute top-1/2 -mt-6 h-12 w-12 rounded-full border-0 bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("post.photoViewer")}
      className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center animate-hx-fade"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-[min(1000px,calc(100vw-32px))] h-[min(80vh,760px)] flex items-center justify-center pointer-events-none animate-hx-pop">
        <img
          key={current.src}
          src={resolveImage(current.src)}
          alt={current.alt || t("common.photoOf", { n: index + 1, total })}
          className="max-w-full max-h-full object-contain select-none pointer-events-auto animate-hx-fade"
        />
      </div>

      <button
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute top-4 left-4 h-10 w-10 rounded-full border-0 bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
      >
        <Icon name="x" size={20} />
      </button>

      {report && (
        <div className="absolute top-4 right-4">
          <MoreMenu
            buttonClass="h-10 w-10 rounded-full border-0 bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
            items={[
              {
                icon: "flag",
                label: report.label || t("report.action"),
                run: () => openReport({ contentType: report.contentType, targetId: report.targetId }),
              },
            ]}
          />
        </div>
      )}

      {total > 1 && (
        <>
          <button onClick={() => step(-1)} aria-label={t("common.previousPhoto")} className={`${navBtn} left-4`}>
            <Icon name="chevLeft" size={22} />
          </button>
          <button onClick={() => step(1)} aria-label={t("common.nextPhoto")} className={`${navBtn} right-4`}>
            <Icon name="chevRight" size={22} />
          </button>
        </>
      )}

      <div className="absolute bottom-5 inset-x-0 text-center text-white/85 text-[13px] pointer-events-none">
        {index + 1} of {total}
      </div>
    </div>,
    document.body
  );
}
