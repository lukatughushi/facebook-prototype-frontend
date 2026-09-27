import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

// Viewers with their own window key handlers (photo viewer, lightbox) call
// this to leave keys to the report dialog while it's open.
export const isReportOpen = () => !!document.querySelector("[data-report-modal]");

export const REPORT_REASONS = [
  "harassment",
  "spam",
  "hate_speech",
  "nudity",
  "false_information",
  "intellectual_property",
  "other",
];

// Three-step report dialog: 1) reason, 2) optional comment, 3) review and
// submit - then a confirmation screen. Sends
// POST /reports { contentType, targetId, reason, comment, parentType?, parentId? }.
export default function ReportModal({ target, onClose }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1); // 1 | 2 | 3 | "done"
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const commentRef = useRef(null);

  useEffect(() => {
    // Capture phase + stopImmediatePropagation: Esc closes only this dialog,
    // not the photo viewer / modal it was opened from.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      if (!sending) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, sending]);

  useEffect(() => {
    if (step === 2) commentRef.current?.focus();
  }, [step]);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError("");
    try {
      await api.post("/reports", {
        contentType: target.contentType,
        targetId: target.targetId,
        reason,
        comment: comment.trim() || undefined,
        ...(target.parentType ? { parentType: target.parentType, parentId: target.parentId } : {}),
      });
      setStep("done");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("report.failed"));
    } finally {
      setSending(false);
    }
  };

  const primaryBtn = "hx-btn flex-1 justify-center bg-hx-accent text-white hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryBtn = "hx-btn flex-1 justify-center bg-hx-btn text-hx-text hover:bg-hx-btnh disabled:opacity-50";
  const title = step === 1 ? t("report.title") : step === 2 ? t("report.detailsTitle") : step === 3 ? t("report.reviewTitle") : t("report.doneTitle");

  return createPortal(
    <div
      onClick={() => !sending && onClose()}
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[110] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-report-modal
        className="w-[500px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card text-hx-text rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          {(step === 2 || step === 3) && (
            <button onClick={() => setStep(step - 1)} disabled={sending} aria-label={t("report.back")} className="hx-icon-btn absolute left-4">
              <Icon name="chevLeft" size={20} />
            </button>
          )}
          <div className="text-center">
            <div className="text-xl font-bold leading-tight">{title}</div>
            {step !== "done" && <div className="text-[12px] text-hx-text2">{t("report.step", { n: step })}</div>}
          </div>
          <button onClick={onClose} disabled={sending} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        {step === 1 && (
          <div className="p-4 flex flex-col gap-3 animate-hx-fade">
            <div className="text-[17px] font-semibold">{t("report.question")}</div>
            <div role="radiogroup" aria-label={t("report.question")} className="flex flex-col -mx-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center justify-between gap-3 w-full px-2 py-3 rounded-md cursor-pointer text-[15px] font-medium hover:bg-hx-hover">
                  <span>{t(`report.reasons.${r}`)}</span>
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-5 h-5 flex-shrink-0 accent-[rgb(var(--accent))] cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!reason} className={primaryBtn}>
              {t("report.next")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-4 flex flex-col gap-3 animate-hx-fade">
            <label className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold">{t("report.detailsLabel")}</span>
              <textarea
                ref={commentRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder={t("report.detailsPlaceholder")}
                className="w-full rounded-md bg-hx-input text-hx-text p-3 text-[15px] border border-transparent focus:border-hx-accent outline-none resize-none"
              />
              <span className="text-[12px] text-hx-text2 self-end">{comment.length}/1000</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className={secondaryBtn}>
                {t("report.back")}
              </button>
              <button onClick={() => setStep(3)} className={primaryBtn}>
                {t("report.next")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-4 flex flex-col gap-4 animate-hx-fade">
            <dl className="rounded-lg bg-hx-input p-3 flex flex-col gap-3 text-[15px]">
              <div>
                <dt className="text-[13px] font-semibold text-hx-text2">{t("report.reviewReason")}</dt>
                <dd className="font-medium">{t(`report.reasons.${reason}`)}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold text-hx-text2">{t("report.reviewComment")}</dt>
                <dd className={`whitespace-pre-wrap break-words ${comment.trim() ? "" : "text-hx-text2 italic"}`}>
                  {comment.trim() || t("report.noComment")}
                </dd>
              </div>
            </dl>
            {error && (
              <div role="alert" className="text-[13px] text-red-500">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} disabled={sending} className={secondaryBtn}>
                {t("report.back")}
              </button>
              <button onClick={submit} disabled={sending} className={primaryBtn}>
                {sending ? t("report.submitting") : t("report.submit")}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div role="alert" className="p-8 flex flex-col items-center gap-3 text-center animate-hx-fade">
            <span className="w-14 h-14 rounded-full bg-[#31a24c] text-white flex items-center justify-center">
              <Icon name="check" size={28} sw={3} />
            </span>
            <p className="text-[17px] font-semibold max-w-[340px]">{t("report.thanks")}</p>
            <button onClick={onClose} className="hx-btn px-8 justify-center bg-hx-accent text-white hover:brightness-95">
              {t("report.done")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
