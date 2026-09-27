import { useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import resolveImage from "../utils/resolveImage";
import { colorFor, initialsOf } from "../utils/format";
import Avatar from "./Avatar";
import Icon from "./Icon";

// Story groups (one per author, each holding their non-expired stories,
// newest activity first) are computed by the parent from GET /api/stories.
// `seen` is a Set of story ids; a group's ring dims once all are seen.
export default function StoriesBar({ groups, seen, onCreateStory, onOpenGroup }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const scroller = useRef(null);

  return (
    <div className="relative">
      <div ref={scroller} className="flex gap-2 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory">
        <div
          onClick={onCreateStory}
          className="group w-28 h-[200px] flex-shrink-0 rounded-xl overflow-hidden bg-hx-card shadow-hx relative cursor-pointer snap-start"
        >
          <div className="h-[150px] overflow-hidden">
            {user?.avatar ? (
              <img
                src={resolveImage(user.avatar)}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            ) : (
              <div
                className="w-full h-full text-white/90 flex items-center justify-center text-[40px] font-bold transition-transform duration-300 group-hover:scale-[1.04]"
                style={{ background: colorFor(user?.name) }}
              >
                {initialsOf(user?.name)}
              </div>
            )}
          </div>
          <div className="absolute left-1/2 top-[130px] -translate-x-1/2 w-10 h-10 rounded-full bg-hx-accent text-white border-4 border-hx-card flex items-center justify-center">
            <Icon name="plus" size={20} sw={3} />
          </div>
          <div className="absolute bottom-2.5 inset-x-0 text-center text-[13px] font-semibold">{t("feed.createStory")}</div>
        </div>

        {groups.map((group, i) => {
          const cover = group.stories[group.stories.length - 1];
          const mine = group.author._id === user?._id;
          const allSeen = group.stories.every((s) => seen?.has(s._id));
          return (
            <div
              key={group.author._id}
              onClick={() => onOpenGroup(i)}
              className="group w-28 h-[200px] flex-shrink-0 rounded-xl overflow-hidden relative cursor-pointer snap-start shadow-hx"
              style={{ background: colorFor(group.author.name) }}
            >
              <div className="absolute inset-0 transition-transform duration-[350ms] group-hover:scale-[1.06]">
                <img src={resolveImage(cover.image)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0)_60%,rgba(0,0,0,0.55)_100%)]" />
              <div
                className="absolute top-3 left-3 w-10 h-10 rounded-full overflow-hidden pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
                style={{ border: `3px solid ${allSeen ? "rgba(255,255,255,0.6)" : "rgb(var(--accent))"}` }}
              >
                <Avatar src={group.author.avatar} name={group.author.name} size={34} style={{ fontSize: 12 }} />
              </div>
              <div className="absolute left-3 right-3 bottom-2.5 text-white text-[13px] font-semibold pointer-events-none truncate [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                {mine ? t("feed.yourStory") : group.author.name}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => scroller.current && (scroller.current.scrollLeft += 240)}
        aria-label={t("stories.more")}
        className="absolute -right-5 top-20 w-10 h-10 rounded-full border border-hx-border bg-hx-card text-hx-text2 shadow-[0_1px_3px_var(--shadow)] hidden min-[600px]:flex items-center justify-center cursor-pointer transition-colors hover:bg-hx-input"
      >
        <Icon name="chevRight" size={20} />
      </button>
    </div>
  );
}
