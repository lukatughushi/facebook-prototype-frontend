import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Lightbox from "./Lightbox";
import { timeAgo } from "../utils/format";
import resolveImage from "../utils/resolveImage";
import { useLanguage } from "../context/LanguageContext";

// What a share post embeds: the original post (with its author, text and
// photo) or reel (poster + play button that opens it in Watch). If the
// original was deleted the reference is null -> "content unavailable".
export default function SharedContent({ post, compact = false }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [lightbox, setLightbox] = useState(false);

  if ("sharedReel" in post) {
    const reel = post.sharedReel;
    if (!reel) return <Unavailable />;
    return (
      <div className="mx-4 mb-3 rounded-lg border border-hx-border overflow-hidden">
        <button
          onClick={() => navigate(`/watch?reel=${reel._id}`)}
          className="relative block w-full bg-black"
          aria-label={t("reels.watchReel")}
        >
          <img
            src={resolveImage(reel.posterUrl)}
            alt=""
            className={`mx-auto object-cover ${compact ? "h-[220px]" : "h-[420px]"} aspect-[9/16] max-w-full`}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-14 h-14 rounded-full bg-black/55 text-white flex items-center justify-center">
              <Icon name="play" size={26} fill="currentColor" sw={1} />
            </span>
          </span>
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-semibold flex items-center gap-1">
            <Icon name="watch" size={12} /> {t("reels.reel")}
          </span>
        </button>
        <OriginalHeader person={reel.author} createdAt={reel.createdAt} audience="Public" />
        {reel.caption && <div className="px-3 pb-3 text-[15px] break-words">{reel.caption}</div>}
      </div>
    );
  }

  if ("sharedPost" in post) {
    const orig = post.sharedPost;
    if (!orig) return <Unavailable />;
    const poster = orig.page && typeof orig.page === "object" ? { ...orig.page, isPage: true } : orig.author;
    return (
      <div className="mx-4 mb-3 rounded-lg border border-hx-border overflow-hidden">
        {orig.image && (
          <img
            src={resolveImage(orig.image)}
            alt=""
            onClick={() => setLightbox(true)}
            className={`block w-full object-cover cursor-zoom-in ${compact ? "max-h-[240px]" : "max-h-[520px]"}`}
          />
        )}
        <OriginalHeader person={poster} group={orig.group} createdAt={orig.createdAt} audience={orig.audience} />
        {orig.content && (
          <div className={`px-3 pb-3 text-[15px] whitespace-pre-wrap break-words ${compact ? "line-clamp-4" : ""}`}>{orig.content}</div>
        )}
        {lightbox && (
          <Lightbox
            images={[orig.image]}
            onClose={() => setLightbox(false)}
            report={{ contentType: "photo", targetId: orig._id, label: t("report.reportPhoto") }}
          />
        )}
      </div>
    );
  }

  return null;
}

function OriginalHeader({ person, group, createdAt, audience }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const open = () => person?._id && navigate(person.isPage ? `/pages/${person._id}` : `/profile/${person._id}`);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div onClick={open} className="cursor-pointer">
        <Avatar src={person?.avatar} name={person?.name} size={36} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-[15px] leading-tight">
          <span onClick={open} className="cursor-pointer hover:underline">
            {person?.name || t("admin.unknown")}
          </span>
          {group && typeof group === "object" && (
            <>
              <span className="text-hx-text2 font-normal"> {t("post.inGroup")} </span>
              <span onClick={() => navigate(`/groups/${group._id}`)} className="cursor-pointer hover:underline">
                {group.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[13px] text-hx-text2">
          <span>{timeAgo(createdAt)}</span>
          <span>·</span>
          <Icon name={audience === "Friends" ? "users" : "globe"} size={12} />
        </div>
      </div>
    </div>
  );
}

function Unavailable() {
  const { t } = useLanguage();
  return (
    <div className="mx-4 mb-3 rounded-lg border border-hx-border bg-hx-bg/50 p-4 flex gap-3 items-start">
      <span className="w-10 h-10 rounded-full bg-hx-btn text-hx-text2 flex items-center justify-center flex-shrink-0">
        <Icon name="lock" size={18} />
      </span>
      <div>
        <div className="font-semibold">{t("shared.unavailableTitle")}</div>
        <div className="text-[13px] text-hx-text2">{t("shared.unavailableText")}</div>
      </div>
    </div>
  );
}
