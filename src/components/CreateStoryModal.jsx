import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// "Create story" composer, in the same dialog chrome as "Create post": an
// image (required) plus an optional caption. Stories expire after 24h.
export default function CreateStoryModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return setError(t("profile.imageType"));
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("profile.imageSize"));
    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!image || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", image);
      if (text.trim()) formData.append("text", text.trim());
      const { data } = await api.post("/stories", formData);
      onCreated?.(data.story);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("stories.createFailed"));
      setSubmitting(false);
    }
  };

  const canPost = !!image;

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("feed.createStory")}
        className="w-[500px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="relative h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("feed.createStory")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-4">
          {preview ? (
            <div className="relative rounded-lg overflow-hidden border border-hx-border animate-hx-fade">
              <img src={preview} alt={t("stories.preview")} className="w-full max-h-[50vh] object-cover" />
              <button
                onClick={() => {
                  setImage(null);
                  setPreview("");
                }}
                aria-label={t("marketplace.removePhoto")}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-hx-card/90 text-hx-text2 flex items-center justify-center shadow-hx hover:bg-hx-card"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-56 rounded-lg border-2 border-dashed border-hx-border bg-transparent flex flex-col items-center justify-center gap-2 text-hx-text2 cursor-pointer transition-colors hover:bg-hx-hover"
            >
              <span className="w-12 h-12 rounded-full bg-hx-btn flex items-center justify-center" style={{ color: "#30a46c" }}>
                <Icon name="image" size={24} />
              </span>
              <span className="font-semibold">{t("stories.addPhoto")}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFile}
            className="hidden"
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("stories.captionPlaceholder")}
            maxLength={300}
            className="w-full min-h-[70px] mt-3 border-0 outline-none resize-none bg-transparent text-hx-text text-[17px]"
          />

          {error && <p className="text-red-500 text-[13px] mt-1">{error}</p>}

          <button
            onClick={submit}
            disabled={!canPost || submitting}
            className="w-full h-9 mt-3 border-0 rounded-md font-semibold text-[15px] transition-colors"
            style={{
              background: canPost ? "rgb(var(--accent))" : "rgb(var(--btn))",
              color: canPost ? "#fff" : "rgb(var(--text2))",
              cursor: canPost && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? t("stories.sharing") : t("stories.share")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
