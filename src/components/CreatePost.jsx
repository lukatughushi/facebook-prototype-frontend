import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { firstName } from "../utils/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import PostModal from "./PostModal";

// Quick buttons: each opens the composer with its picker already open.
const ACTIONS = [
  { label: "feed.photo", icon: "image", color: "#30a46c", action: "photo" },
  { label: "feed.feeling", icon: "smile", color: "#f5a524", action: "feeling" },
];

// "What's on your mind?" card. Any part of it opens the PostModal composer.
// Bumping `openSignal` opens it programmatically (header Create > Post).
export default function CreatePost({ onCreated, openSignal = 0, target }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(null); // null | { action? }

  useEffect(() => {
    if (openSignal > 0) setOpen({});
  }, [openSignal]);

  return (
    <>
      <div className="card pt-3 px-4 pb-2">
        <div className="flex gap-2 items-center">
          <Avatar src={target?.page?.avatar ?? user?.avatar} name={target?.page?.name || user?.name} size={40} />
          <button
            onClick={() => setOpen({})}
            className="flex-1 min-w-0 h-10 rounded-[20px] border-0 bg-hx-input hover:bg-hx-btn text-hx-text2 text-[17px] text-left px-3 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
          >
            {target?.group ? t("feed.writeSomething") : t("feed.whatsOnYourMind", { name: firstName(target?.page?.name || user?.name) })}
          </button>
        </div>
        <div className="h-px bg-hx-border mt-3 mb-2" />
        <div className="flex gap-1">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => setOpen({ action: a.action })}
              className="flex-1 min-w-0 h-10 border-0 rounded-lg bg-transparent flex items-center justify-center gap-2 cursor-pointer text-hx-text2 font-semibold text-[15px] transition-colors hover:bg-hx-hover"
            >
              <span style={{ color: a.color }}>
                <Icon name={a.icon} size={22} />
              </span>
              <span className="hidden min-[480px]:inline whitespace-nowrap overflow-hidden text-ellipsis">{t(a.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <PostModal mode="create" target={target} initialAction={open.action} onClose={() => setOpen(null)} onCreated={onCreated} />
      )}
    </>
  );
}
