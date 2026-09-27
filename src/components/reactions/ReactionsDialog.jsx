import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { REACTION } from "../../utils/reactions";
import Avatar from "../Avatar";
import Icon from "../Icon";
import Emoji from "./Emoji";
import { useLanguage } from "../../context/LanguageContext";

// "Who reacted" dialog opened from a post's reaction summary: an All tab
// plus one tab per reaction type, each listing the people (GET
// /posts/:id/reactions). Clicking a person opens their profile.
export default function ReactionsDialog({ postId, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/posts/${postId}/reactions`)
      .then(({ data }) => !cancelled && setList(data.reactions))
      .catch(() => !cancelled && setError(t("reactions.loadFailed")));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const counts = {};
  for (const r of list || []) counts[r.type] = (counts[r.type] || 0) + 1;
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const shown = (list || []).filter((r) => tab === "all" || r.type === tab);

  const tabBtn = (active) =>
    `relative h-12 px-3 flex items-center gap-1.5 font-semibold text-[15px] flex-shrink-0 ${active ? "text-hx-accent" : "text-hx-text2 hover:bg-hx-hover rounded-md"}`;

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[95] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("reactions.title")}
        className="w-[500px] max-w-full h-[min(560px,calc(100vh-32px))] bg-hx-card text-hx-text rounded-lg shadow-hx-pop flex flex-col animate-hx-pop"
      >
        <div className="flex items-center border-b border-hx-border px-2 flex-shrink-0">
          <div className="flex-1 min-w-0 flex overflow-x-auto scrollbar-none" role="tablist">
            <button role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")} className={tabBtn(tab === "all")}>
              {t("common.all")} {list ? list.length : ""}
              {tab === "all" && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-hx-accent rounded-t" />}
            </button>
            {types.map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={tab === type}
                aria-label={REACTION[type]?.label}
                onClick={() => setTab(type)}
                className={tabBtn(tab === type)}
              >
                <Emoji type={type} size={20} />
                {counts[type]}
                {tab === type && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-hx-accent rounded-t" />}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn ml-2 flex-shrink-0">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {error && <p className="text-center text-red-500 py-6">{error}</p>}
          {!list && !error && <p className="text-center text-hx-text2 py-6">{t("common.loading")}</p>}
          {list && shown.length === 0 && <p className="text-center text-hx-text2 py-6">{t("reactions.none")}</p>}
          {shown.map(({ user, type }) => (
            <button
              key={user._id}
              onClick={() => {
                onClose();
                navigate(`/profile/${user._id}`);
              }}
              className="hx-row"
            >
              <span className="relative flex-shrink-0">
                <Avatar src={user.avatar} name={user.name} size={40} />
                <span className="absolute -right-1 -bottom-1 rounded-full ring-2 ring-hx-card bg-hx-card">
                  <Emoji type={type} size={16} />
                </span>
              </span>
              <span className="flex-1 min-w-0 font-medium truncate text-left">{user.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
