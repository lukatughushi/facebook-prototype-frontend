import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { firstName } from "../utils/format";
import resolveImage from "../utils/resolveImage";
import Avatar from "./Avatar";
import EmojiPicker from "./EmojiPicker";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// The design's "Create post" dialog, also used (pre-filled) to edit a post.
// Creating posts multipart to POST /posts with content, audience and image.
// `target` ({ group } or { page }) posts into a group or as a page.
// `initialAction` ("photo" | "feeling") opens the file or emoji picker
// straight away (the composer card's quick buttons).
export default function PostModal({ mode = "create", post, target, initialAction, onClose, onCreated, onUpdated }) {
  const { user } = useAuth();
  const isEdit = mode === "edit";
  const { t } = useLanguage();

  const [draft, setDraft] = useState(isEdit ? post?.content || "" : "");
  const [audience, setAudience] = useState(isEdit ? post?.audience || "Public" : "Public");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(initialAction === "feeling");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  // Parents pass an inline onClose; reading it through a ref keeps the
  // mount effect below from re-running (and re-focusing) on their renders.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const emojiOpenRef = useRef(emojiOpen);
  emojiOpenRef.current = emojiOpen;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (emojiOpenRef.current) setEmojiOpen(false);
      else onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    const t = setTimeout(() => {
      if (initialAction === "photo") fileInputRef.current?.click();
      else textareaRef.current?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const canPost = isEdit ? !!draft.trim() : !!(draft.trim() || image);

  const submitPost = async () => {
    if (!canPost || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        const { data } = await api.patch(`/posts/${post._id}`, { content: draft.trim() });
        onUpdated?.(data.post);
      } else {
        const formData = new FormData();
        formData.append("content", draft.trim());
        formData.append("audience", audience);
        if (target?.group) formData.append("group", target.group._id);
        if (target?.page) formData.append("page", target.page._id);
        if (image) formData.append("image", image);
        const { data } = await api.post("/posts", formData);
        onCreated?.(data.post);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("common.somethingWrong"));
      setSubmitting(false);
    }
  };

  const actions = [{ label: t("feed.photo"), icon: "image", color: "#30a46c", run: () => fileInputRef.current?.click() }];

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? t("post.edit") : t("post.create")}
        className="w-[500px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="relative h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{isEdit ? t("post.edit") : t("post.create")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-3 items-center">
            <Avatar src={target?.page?.avatar ?? user?.avatar} name={target?.page?.name || user?.name} size={40} />
            <div>
              <div className="font-semibold">
                {target?.page?.name || user?.name}
                {target?.group && (
                  <>
                    <span className="text-hx-text2 font-normal"> {t("post.inGroup")} </span>
                    {target.group.name}
                  </>
                )}
              </div>
              {!target && (
              <button
                type="button"
                disabled={isEdit}
                onClick={() => setAudience((a) => (a === "Public" ? "Friends" : "Public"))}
                className="mt-0.5 h-6 px-2 border-0 rounded-md bg-hx-btn hover:bg-hx-btnh text-hx-text text-[13px] font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-default"
              >
                <Icon name={audience === "Public" ? "globe" : "users"} size={12} />
                <span>{audience === "Public" ? t("post.audiencePublic") : t("post.audienceFriends")}</span>
                {!isEdit && <Icon name="chevDown" size={10} sw={3} />}
              </button>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={target?.group ? t("feed.writeSomething") : t("feed.whatsOnYourMind", { name: firstName(user?.name) })}
            className="w-full min-h-[150px] mt-3 border-0 outline-none resize-none bg-transparent text-hx-text leading-[1.3] transition-[font-size] duration-150"
            style={{ fontSize: draft.length > 85 || preview || (isEdit && post?.image) ? 15 : 24 }}
          />

          {isEdit && post?.image && (
            <img src={resolveImage(post.image)} alt="" className="w-full max-h-64 object-cover rounded-lg border border-hx-border" />
          )}

          {preview && (
            <div className="relative rounded-lg overflow-hidden border border-hx-border animate-hx-fade">
              <img src={preview} alt={t("post.selectedPhoto")} className="w-full max-h-72 object-cover" />
              <button
                type="button"
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
          )}

          {!isEdit && (
            <div className="flex items-center justify-between border border-hx-border rounded-lg py-2 pr-2 pl-4 mt-2 gap-2">
              <div className="font-semibold">{t("post.addToPost")}</div>
              <div className="flex gap-0.5">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    title={a.label}
                    onClick={a.run}
                    className="w-9 h-9 rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer hover:bg-hx-hover"
                    style={{ color: a.color }}
                  >
                    <Icon name={a.icon} size={22} />
                  </button>
                ))}
                <EmojiPicker open={emojiOpen} onToggle={setEmojiOpen} onSelect={insertEmoji} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          <button
            onClick={submitPost}
            disabled={!canPost || submitting}
            className="w-full h-9 mt-4 border-0 rounded-md font-semibold text-[15px] transition-colors"
            style={{
              background: canPost ? "rgb(var(--accent))" : "rgb(var(--btn))",
              color: canPost ? "#fff" : "rgb(var(--text2))",
              cursor: canPost && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? (isEdit ? t("common.saving") : t("post.posting")) : isEdit ? t("common.saveShort") : t("post.post")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
