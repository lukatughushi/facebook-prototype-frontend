import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReportModal from "../components/ReportModal";
import { useLanguage } from "./LanguageContext";

// App-wide "Report" flow. Any three-dots menu calls
//   const report = useReport(); report({ contentType: "post", targetId: post._id })
// (comment reports also pass parentType/parentId) to open the report dialog.
// Also exposes toast(text, action?) for short confirmations, where action is
// an optional { label, run } button such as "Undo".
const ReportContext = createContext(null);

export function ReportProvider({ children }) {
  const { t } = useLanguage();
  const [target, setTarget] = useState(null); // what is being reported
  const [toastState, setToastState] = useState(null); // { text, action? }
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const toast = useCallback((text, action) => {
    setToastState({ text, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), 5000);
  }, []);

  const report = useCallback((next) => next?.targetId && setTarget(next), []);
  const closeReport = useCallback(() => setTarget(null), []);

  return (
    <ReportContext.Provider value={{ report, toast }}>
      {children}
      {target && <ReportModal target={target} onClose={closeReport} />}
      {toastState && (
        <div
          role="status"
          aria-live="polite"
          className="fixed z-[120] bottom-6 left-4 right-4 min-[600px]:right-auto min-[600px]:max-w-[420px] px-4 py-3 rounded-lg bg-[#242526] text-white shadow-hx-pop flex items-center gap-3 animate-hx-pop"
        >
          <span className="flex-1 text-[15px] leading-snug">{toastState.text}</span>
          {toastState.action && (
            <button
              onClick={() => {
                setToastState(null);
                toastState.action.run();
              }}
              className="font-semibold text-[#4599ff] hover:underline"
            >
              {toastState.action.label}
            </button>
          )}
          <button onClick={() => setToastState(null)} aria-label={t("common.close")} className="text-white/70 hover:text-white text-lg leading-none">
            ×
          </button>
        </div>
      )}
    </ReportContext.Provider>
  );
}

export const useReport = () => useContext(ReportContext).report;
export const useToast = () => useContext(ReportContext).toast;
