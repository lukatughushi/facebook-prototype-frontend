import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import SharedContent from "./SharedContent";
import { useLanguage } from "../context/LanguageContext";

// "Share" dialog for a post or a reel: optional caption + audience, with a
// preview of what will be shared. Creates a new post on the user's timeline
// (POST /posts/:id/share or /reels/:id/share) and reports it via onShared.
export default function ShareDialog({ kind, item, onClose, onShared }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("Public");
  const [status, setStatus] = useState("idle"); // idle | sharing | done
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Preview as the share post will look: sharing a share shares its original.
  const preview =
    kind === "reel"
      ? { sharedReel: item }
      : "sharedPost" in item || "sharedReel" in item
        ? item
        : { sharedPost: item };

  const share = async () => {
    setStatus("sharing");
    setError("");
    try {
      const { data } = await api.post(`/${kind === "reel" ? "reels" : "posts"}/${item._id}/share`, {
        content: caption.trim(),
        audience,
      });
      onShared?.(data);
      setStatus("done");
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err.response?.data?.message || t("share.failed"));
      setStatus("idle");
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[90] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("post.share")}
        className="w-[500px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card text-hx-text rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("post.share")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>

        {status === "done" ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center animate-hx-fade">
            <span className="w-14 h-14 rounded-full bg-[#31a24c] text-white flex items-center justify-center">
              <Icon name="check" size={28} sw={3} />
            </span>
            <div className="text-[17px] font-semibold">{t("share.done")}</div>
            <button
              onClick={() => {
                onClose();
                navigate(`/profile/${user._id}`);
              }}
              className="text-hx-accent font-semibold hover:underline"
            >
              {t("share.viewOnProfile")}
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-3 items-center">
              <Avatar src={user?.avatar} name={user?.name} size={40} />
              <div>
                <div className="font-semibold">{user?.name}</div>
                <button
                  type="button"
                  onClick={() => setAudience((a) => (a === "Public" ? "Friends" : "Public"))}
                  className="mt-0.5 h-6 px-2 border-0 rounded-md bg-hx-btn hover:bg-hx-btnh text-hx-text text-[13px] font-semibold flex items-center gap-1"
                >
                  <Icon name={audience === "Public" ? "globe" : "users"} size={12} />
                  <span>{audience}</span>
                  <Icon name="chevDown" size={10} sw={3} />
                </button>
              </div>
            </div>
            <textarea
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("share.placeholder")}
              maxLength={5000}
              className="w-full min-h-[70px] border-0 outline-none resize-none bg-transparent text-hx-text text-[17px]"
            />
            <div className="-mx-4 pointer-events-none">
              <SharedContent post={preview} compact />
            </div>
            {error && <p className="text-red-500 text-[13px]">{error}</p>}
            <button
              onClick={share}
              disabled={status === "sharing"}
              className="w-full h-9 border-0 rounded-md bg-hx-accent text-white font-semibold text-[15px] hover:brightness-95 disabled:opacity-70"
            >
              {status === "sharing" ? t("stories.sharing") : t("share.now")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
