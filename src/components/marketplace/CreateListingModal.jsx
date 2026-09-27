import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import Icon from "../Icon";
import { useLanguage } from "../../context/LanguageContext";

export const CATEGORIES = [
  { label: "Electronics", icon: "laptop" },
  { label: "Vehicles", icon: "car" },
  { label: "Apparel", icon: "shirt" },
  { label: "Furniture", icon: "sofa" },
  { label: "Property", icon: "home" },
  { label: "Hobbies", icon: "puzzle" },
];
const CONDITIONS = ["New", "Used - Like new", "Used - Good", "Used - Fair"];
const CONDITION_KEYS = { New: "new", "Used - Like new": "likeNew", "Used - Good": "good", "Used - Fair": "fair" };

// Category / condition values are stored in English; these give their label
// in the UI language (unknown values are shown as stored).
const translated = (t, key, fallback) => {
  const text = t(key);
  return text === key ? fallback : text;
};
export const categoryLabel = (t, category) => translated(t, `marketplace.categories.${String(category).toLowerCase()}`, category);
export const conditionLabel = (t, condition) => translated(t, `marketplace.conditions.${CONDITION_KEYS[condition] || condition}`, condition);
const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

const field =
  "w-full h-11 rounded-md border border-hx-border bg-hx-card text-hx-text text-[15px] px-3 outline-none focus:border-hx-accent focus:shadow-[0_0_0_2px_var(--accent-soft)]";

// "Create new listing": up to 5 photos plus details, sent multipart to
// POST /marketplace. Calls onCreated(item) with the saved listing.
export default function CreateListingModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState([]); // { file, url }
  const [form, setForm] = useState({ title: "", price: "", category: "Electronics", condition: "Used - Good", location: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

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

  // Free every preview URL on close. (Revoking in a [photos] cleanup would
  // also revoke the photos that are still shown whenever one is added.)
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addPhotos = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    const bad = files.find((f) => !/^image\/(jpeg|png|gif|webp)$/.test(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(t("marketplace.photoRules"));
    setError("");
    // Object URLs are created outside the state updater (StrictMode runs
    // updaters twice, which would leak one set).
    const added = files.slice(0, MAX_PHOTOS - photos.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos([...photos, ...added]);
  };

  const ready = photos.length > 0 && form.title.trim() && form.price !== "" && Number(form.price) >= 0 && form.location.trim();

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, typeof v === "string" ? v.trim() : v));
      photos.forEach((p) => body.append("images", p.file));
      const { data } = await api.post("/marketplace", body);
      onCreated(data.item);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("marketplace.publishFailed"));
      setSaving(false);
    }
  };

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("marketplace.createListing")}
        className="w-[560px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("marketplace.createListing")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <div className="text-[15px] font-semibold mb-2">
              {t("marketplace.photos")} · {photos.length}/{MAX_PHOTOS}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative aspect-square rounded-lg overflow-hidden bg-hx-input">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPhotos((prev) => prev.filter((_, j) => j !== i));
                    }}
                    aria-label={t("marketplace.removePhoto")}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <Icon name="x" size={12} sw={3} />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 rounded">{t("marketplace.cover")}</span>}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-hx-border text-hx-text2 flex flex-col items-center justify-center gap-1 hover:bg-hx-hover"
                >
                  <Icon name="image" size={22} />
                  <span className="text-xs font-semibold">{t("marketplace.addPhotos")}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={addPhotos} className="hidden" />
          </div>

          <input value={form.title} onChange={set("title")} placeholder={t("marketplace.titlePlaceholder")} maxLength={100} className={field} />
          <input value={form.price} onChange={set("price")} placeholder={t("marketplace.pricePlaceholder")} type="number" min="0" step="1" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={set("category")} className={field} aria-label={t("marketplace.category")}>
              {CATEGORIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {categoryLabel(t, c.label)}
                </option>
              ))}
            </select>
            <select value={form.condition} onChange={set("condition")} className={field} aria-label={t("marketplace.condition")}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {conditionLabel(t, c)}
                </option>
              ))}
            </select>
          </div>
          <input value={form.location} onChange={set("location")} placeholder={t("marketplace.locationPlaceholder")} maxLength={100} className={field} />
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder={t("marketplace.description")}
            maxLength={2000}
            className={`${field} h-28 py-2.5 resize-none`}
          />

          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          <button
            onClick={submit}
            disabled={!ready || saving}
            className="w-full h-9 border-0 rounded-md font-semibold text-[15px] transition-colors"
            style={{
              background: ready ? "rgb(var(--accent))" : "rgb(var(--btn))",
              color: ready ? "#fff" : "rgb(var(--text2))",
              cursor: ready && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? t("marketplace.publishing") : t("marketplace.publish")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
