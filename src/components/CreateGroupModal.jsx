import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import Icon from "./Icon";
import { topicLabel } from "../utils/topics";
import { useLanguage } from "../context/LanguageContext";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const CATEGORIES = ["Community", "Tech", "Sports", "Gaming", "Photography", "Music", "Food", "Travel", "Books", "Fitness"];
const field =
  "w-full h-11 rounded-md border border-hx-border bg-hx-card text-hx-text text-[15px] px-3 outline-none focus:border-hx-accent focus:shadow-[0_0_0_2px_var(--accent-soft)]";

// "Create group": name, privacy, topic, description and an optional cover,
// sent multipart to POST /groups. The creator becomes its admin.
export default function CreateGroupModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", privacy: "public", category: "Community", description: "" });
  const [cover, setCover] = useState(null); // { file, url }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => () => cover && URL.revokeObjectURL(cover.url), [cover]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickCover = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setError(t("common.coverRules"));
      return;
    }
    setError("");
    setCover({ file, url: URL.createObjectURL(file) });
  };

  const ready = !!form.name.trim();

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v.trim()));
      if (cover) body.append("coverImage", cover.file);
      const { data } = await api.post("/groups", body);
      onCreated(data.group);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("groups.createFailed"));
      setSaving(false);
    }
  };

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("groups.create")}
        className="w-[520px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("groups.create")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-36 rounded-lg overflow-hidden border-2 border-dashed border-hx-border text-hx-text2 flex flex-col items-center justify-center gap-1 hover:bg-hx-hover"
          >
            {cover ? (
              <img src={cover.url} alt={t("common.coverPreview")} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Icon name="image" size={22} />
                <span className="text-[13px] font-semibold">{t("common.addCoverOptional")}</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={pickCover} className="hidden" />
          <input autoFocus value={form.name} onChange={set("name")} placeholder={t("groups.name")} maxLength={100} className={field} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.privacy} onChange={set("privacy")} aria-label={t("groups.privacy")} className={field}>
              <option value="public">{t("groups.public")}</option>
              <option value="private">{t("groups.private")}</option>
            </select>
            <select value={form.category} onChange={set("category")} aria-label={t("groups.topic")} className={field}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {topicLabel(t, c)}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder={t("groups.aboutPlaceholder")}
            maxLength={1000}
            className={`${field} h-24 py-2.5 resize-none`}
          />
          <p className="text-[13px] text-hx-text2">
            {form.privacy === "private"
              ? t("groups.privateText")
              : t("groups.publicText")}
          </p>
          {error && <p className="text-red-500 text-[13px]">{error}</p>}
          <button
            onClick={submit}
            disabled={!ready || saving}
            className="w-full h-9 border-0 rounded-md font-semibold text-[15px] transition-colors disabled:cursor-not-allowed"
            style={{ background: ready ? "rgb(var(--accent))" : "rgb(var(--btn))", color: ready ? "#fff" : "rgb(var(--text2))" }}
          >
            {saving ? t("common.creating") : t("common.create")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
