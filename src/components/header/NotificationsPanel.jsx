import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../../utils/format";
import { useLanguage } from "../../context/LanguageContext";
import Avatar from "../Avatar";
import Icon from "../Icon";

const TYPES = {
  like: { icon: "love", color: "#e0245e", text: "notifications.like" },
  comment: { icon: "comment", color: "#30a46c", text: "notifications.comment" },
  share: { icon: "share", color: "#8b5cf6", text: "notifications.share" },
  friend_request: { icon: "users", color: "#1877f2", text: "notifications.friend_request" },
  friend_accept: { icon: "userCheck", color: "#1877f2", text: "notifications.friend_accept" },
};

// Notifications panel with All/Unread filters, inline Confirm/Delete for
// friend requests, per-item remove and Clear all. Clicking a post
// notification opens the post; others open the sender's profile. State
// (list + badge count) comes from useNotifications.
export default function NotificationsPanel({ notifications, open, markRead, markAllRead, remove, respondToRequest, clearAll, onClose }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filter, setFilter] = useState("all");

  // Opening the panel marks everything read (badge -> 0); items that were
  // unread stay highlighted ("fresh") until the panel closes.
  useEffect(() => {
    open();
  }, [open]);

  const isNew = (n) => !n.read || n.fresh;
  const list = notifications.filter((n) => filter === "all" || isNew(n));

  return (
    <div className="panel absolute top-12 right-0 w-[min(360px,calc(100vw-16px))] max-h-[calc(100vh-72px)] overflow-auto px-2 py-3 z-40">
      <div className="flex justify-between items-center gap-2 px-2 pb-2">
        <div className="text-2xl font-bold">{t("notifications.title")}</div>
        {notifications.length > 0 && (
          <div className="flex gap-3 text-sm">
            <button onClick={() => markAllRead()} className="text-hx-accent hover:underline">
              {t("notifications.markAllRead")}
            </button>
            <button onClick={clearAll} className="text-hx-text2 hover:underline">
              {t("notifications.clearAll")}
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-1.5 px-2 pb-2">
        {["all", "unread"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-[18px] font-semibold text-[15px] transition-colors ${
              filter === f ? "bg-hx-accent-soft text-hx-accent" : "text-hx-text hover:bg-hx-hover"
            }`}
          >
            {f === "all" ? t("notifications.all") : t("notifications.unread")}
          </button>
        ))}
      </div>

      {list.map((n) => {
        const type = TYPES[n.type] || TYPES.like;
        const pending = n.type === "friend_request" && n.status !== "accepted";
        return (
          <div
            key={n._id}
            onClick={() => {
              markRead(n._id);
              const to = n.post ? `/posts/${n.post}` : n.sender?._id ? `/profile/${n.sender._id}` : null;
              if (to) {
                onClose();
                navigate(to);
              }
            }}
            className="hx-row group"
          >
            <span className="relative flex-shrink-0">
              <Avatar src={n.sender?.avatar} name={n.sender?.name || "?"} size={56} />
              <span
                className="absolute -right-1 -bottom-0.5 h-[26px] w-[26px] rounded-full text-white flex items-center justify-center border-2 border-hx-card"
                style={{ background: type.color }}
              >
                <Icon name={type.icon} size={13} sw={2.5} />
              </span>
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[15px] ${isNew(n) ? "text-hx-text" : "text-hx-text2"}`}>
                <b className="font-semibold text-hx-text">{n.sender?.name || t("notifications.someone")}</b> {t(type.text)}
              </span>
              <span className={`block text-[13px] mt-0.5 ${isNew(n) ? "text-hx-accent font-semibold" : "text-hx-text2"}`}>
                {timeAgo(n.createdAt)}
              </span>
              {pending && (
                <span className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => respondToRequest(n._id, "accept")} className="hx-btn bg-hx-accent text-white hover:brightness-95 flex-1">
                    {t("common.confirm")}
                  </button>
                  <button onClick={() => respondToRequest(n._id, "reject")} className="hx-btn bg-hx-btn text-hx-text hover:bg-hx-btnh flex-1">
                    {t("common.delete")}
                  </button>
                </span>
              )}
              {n.type === "friend_request" && n.status === "accepted" && (
                <span className="block text-[13px] text-hx-text2 mt-1">{t("notifications.requestAccepted")}</span>
              )}
            </span>
            {isNew(n) && <span className="h-3 w-3 rounded-full bg-hx-accent flex-shrink-0" aria-label={t("notifications.unread")} />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(n._id);
              }}
              aria-label={t("notifications.remove")}
              title={t("notifications.remove")}
              className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-hx-text2 hover:bg-hx-btn opacity-100 min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        );
      })}

      {list.length === 0 && <div className="px-2 py-6 text-center text-hx-text2">{t("notifications.empty")}</div>}
    </div>
  );
}
