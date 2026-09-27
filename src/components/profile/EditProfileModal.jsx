import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "../Avatar";
import Icon from "../Icon";
import resolveImage from "../../utils/resolveImage";
import { BIO_MAX } from "./ProfileSections";
import { useLanguage } from "../../context/LanguageContext";

const FIELDS = [
  { key: "work", label: "profile.fields.work" },
  { key: "education", label: "profile.fields.education" },
  { key: "city", label: "profile.fields.city" },
  { key: "hometown", label: "profile.fields.hometown" },
];

const inputCls =
  "rounded-md border border-hx-border bg-hx-card text-hx-text text-[15px] outline-none focus:border-hx-accent focus:shadow-[0_0_0_2px_var(--accent-soft)]";

// "Edit profile" dialog: photo pickers plus bio and intro details, saved via
// PUT /auth/me by the parent's onSave.
export default function EditProfileModal({ profile, uploading, onPickAvatar, onPickCover, onSave, onClose }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(() => ({
    bio: (profile.bio || "").slice(0, BIO_MAX),
    ...Object.fromEntries(FIELDS.map(({ key }) => [key, profile[key] || ""])),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])));
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("profile.saveFailed"));
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="w-[700px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop">
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div id="edit-profile-title" className="text-xl font-bold">
            {t("profile.editProfile")}
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar src={profile.avatar} name={profile.name} size={56} />
              <div className="text-[17px] font-semibold">{t("profile.profilePicture")}</div>
            </div>
            <button onClick={onPickAvatar} disabled={!!uploading} className="hx-btn text-hx-accent hover:bg-hx-hover">
              {uploading === "avatar" ? t("common.uploading") : t("common.change")}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-24 h-14 rounded-md bg-hx-input overflow-hidden">
                {profile.coverImage && <img src={resolveImage(profile.coverImage)} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="text-[17px] font-semibold">{t("profile.coverPhoto")}</div>
            </div>
            <button onClick={onPickCover} disabled={!!uploading} className="hx-btn text-hx-accent hover:bg-hx-hover">
              {uploading === "cover" ? t("common.uploading") : t("common.change")}
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[17px] font-semibold">{t("profile.bio")}</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))}
              maxLength={BIO_MAX}
              placeholder={t("profile.bioPlaceholder")}
              className={`${inputCls} w-full min-h-[80px] px-3 py-2.5 resize-none`}
            />
            <span className="text-[13px] text-hx-text2 self-end">{t("profile.charsLeft", { count: BIO_MAX - form.bio.length })}</span>
          </label>

          <div className="flex flex-col gap-2.5">
            <div className="text-[17px] font-semibold">{t("profile.customizeIntro")}</div>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
              {FIELDS.map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1 text-[13px] text-hx-text2">
                  {t(label)}
                  <input value={form[key]} onChange={set(key)} maxLength={100} className={`${inputCls} h-10 px-3`} />
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-hx-border">
          <button onClick={onClose} className="hx-btn px-4 text-hx-accent hover:bg-hx-hover">
            {t("common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="hx-btn px-6 bg-hx-accent text-white hover:brightness-95">
            {saving ? t("common.saving") : t("common.saveShort")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
