import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { timeAgo } from "../utils/format";
import { locale, useLanguage } from "../context/LanguageContext";
import { REACTION, summarize } from "../utils/reactions";
import useMediaQuery from "../hooks/useMediaQuery";
import CommentSection from "../components/CommentSection";
import ShareDialog from "../components/ShareDialog";
import Emoji from "../components/reactions/Emoji";
import ReactionPicker from "../components/reactions/ReactionPicker";
import ReactionSummary from "../components/reactions/ReactionSummary";
import MoreMenu from "../components/MoreMenu";
import { useAuth } from "../context/AuthContext";
import { useReport, useToast } from "../context/ReportContext";
import { isReportOpen } from "../components/ReportModal";

const compact = (n) => new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);

function RailButton({ icon, label, count, active, activeColor, onClick, fill }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1 text-white group">
      <span
        className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center transition group-hover:bg-black/55 group-active:scale-90"
        style={{ color: active ? activeColor : "#fff" }}
      >
        <Icon name={icon} size={24} sw={2.2} fill={fill} />
      </span>
      {count !== undefined && <span className="text-xs font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{compact(count)}</span>}
    </button>
  );
}

// One full-height reel: plays while `active`, tap to pause, double-tap to
// like, progress bar to seek, action rail on the right.
function ReelCard({ reel, index, active, near, muted, onToggleMute, onReact, onComments, onShare, onNotInterested, onMuteAuthor }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const report = useReport();
  const toast = useToast();
  const isMine = reel.author?._id === user?._id;

  const copyLink = () =>
    navigator.clipboard
      .writeText(`${window.location.origin}/watch?reel=${reel._id}`)
      .then(() => toast(t("post.linkCopied")), () => toast(t("post.copyFailed")));
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [flash, setFlash] = useState(null); // "play" | "pause" | "heart"
  const [expanded, setExpanded] = useState(false);
  const clickTimer = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      setPaused(false);
      v.play().catch(() => setPaused(true));
    } else {
      v.pause();
    }
  }, [active]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
      setFlash("play");
    } else {
      v.pause();
      setPaused(true);
      setFlash("pause");
    }
  };

  // Single click toggles play; a quick second click is a double-tap like.
  const onVideoClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setFlash("heart");
      if (!reel.myReaction) onReact("love");
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      togglePlay();
    }, 220);
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  };

  // Registered so the page's keyboard handler can toggle the active reel.
  useEffect(() => {
    if (active) ReelCard.toggleActive = togglePlay;
  });

  const music = reel.musicTrack?.artist
    ? `${reel.musicTrack.title} · ${reel.musicTrack.artist}`
    : t("reels.originalAudio", { name: reel.author?.name });

  return (
    <section data-index={index} className="reel h-full snap-start snap-always flex items-center justify-center py-3 px-2">
      <div className="relative h-full aspect-[9/16] max-w-full rounded-xl overflow-hidden bg-black shadow-hx-pop">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.posterUrl}
          loop
          playsInline
          muted={muted}
          preload={near ? "auto" : "none"}
          onClick={onVideoClick}
          onTimeUpdate={(e) => e.currentTarget.duration && setProgress(e.currentTarget.currentTime / e.currentTarget.duration)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        />

        {/* top controls */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <button
          onClick={togglePlay}
          aria-label={paused ? t("reels.play") : t("reels.pause")}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center"
        >
          <Icon name={paused ? "play" : "pause"} size={16} fill="currentColor" sw={1.5} />
        </button>
        <button
          onClick={onToggleMute}
          aria-label={muted ? t("reels.unmute") : t("reels.mute")}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center"
        >
          <Icon name={muted ? "volumeX" : "volume"} size={18} />
        </button>

        {buffering && active && !paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full border-[3px] border-white/80 border-t-transparent animate-spin" />
          </div>
        )}
        {paused && !flash && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-16 h-16 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Icon name="play" size={30} fill="currentColor" sw={1} />
            </span>
          </div>
        )}
        {flash && (
          <div
            key={flash}
            onAnimationEnd={() => setFlash(null)}
            className="absolute inset-0 flex items-center justify-center pointer-events-none animate-[reelFlash_.6s_ease-out_forwards]"
          >
            {flash === "heart" ? (
              <Icon name="love" size={96} fill="#e0245e" sw={0} style={{ color: "#e0245e", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))" }} />
            ) : (
              <span className="w-16 h-16 rounded-full bg-black/40 text-white flex items-center justify-center">
                <Icon name={flash} size={28} fill="currentColor" sw={1} />
              </span>
            )}
          </div>
        )}

        {/* action rail */}
        {/* z-10: keeps the rail above the caption overlay rendered after it */}
        <div className="absolute z-10 right-2.5 bottom-24 flex flex-col items-center gap-4">
          <button onClick={() => navigate(`/profile/${reel.author?._id}`)} aria-label={reel.author?.name} className="rounded-full border-2 border-white">
            <Avatar src={reel.author?.avatar} name={reel.author?.name} size={40} />
          </button>
          <ReactionPicker onPick={onReact} placement="left">
            <button
              onClick={() => onReact(reel.myReaction || "like")}
              aria-label={reel.myReaction ? REACTION[reel.myReaction].label : t("post.like")}
              className="flex flex-col items-center gap-1 text-white group"
            >
              <span className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center transition group-hover:bg-black/55 group-active:scale-90">
                {reel.myReaction ? (
                  <span key={reel.myReaction} className="animate-[reactPop_.3s_ease-out]">
                    <Emoji type={reel.myReaction} size={26} />
                  </span>
                ) : (
                  <Icon name="like" size={24} sw={2.2} />
                )}
              </span>
              <span className="text-xs font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{compact(reel.reactionsCount)}</span>
            </button>
          </ReactionPicker>
          <RailButton icon="comment" label={t("reels.comments")} count={reel.commentsCount} onClick={onComments} />
          <RailButton icon="share" label={t("post.share")} count={reel.sharesCount} onClick={onShare} />
          <MoreMenu
            up
            iconSize={24}
            width="w-64"
            buttonClass="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center transition hover:bg-black/55"
            items={[
              !isMine && { icon: "flag", label: t("report.reportReel"), run: () => report({ contentType: "reel", targetId: reel._id }) },
              { icon: "link", label: t("post.copyLink"), run: copyLink },
              !isMine && { icon: "eyeOff", label: t("reels.notInterested"), run: () => onNotInterested(reel) },
              !isMine && reel.author?._id && {
                icon: "volumeX",
                label: t("reels.muteAuthor", { name: reel.author.name }),
                run: () => onMuteAuthor(reel.author),
              },
            ]}
          />
        </div>

        {/* caption + music */}
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-4 pl-3 pr-16 bg-gradient-to-t from-black/75 via-black/30 to-transparent text-white">
          <div className="flex items-center gap-2 font-semibold">
            <span onClick={() => navigate(`/profile/${reel.author?._id}`)} className="cursor-pointer hover:underline [text-shadow:0_1px_2px_rgba(0,0,0,.5)]">
              {reel.author?.name}
            </span>
            <span className="text-xs font-normal text-white/75">· {timeAgo(reel.createdAt)}</span>
          </div>
          {reel.caption && (
            <p
              onClick={() => setExpanded((x) => !x)}
              className={`mt-1 text-[14px] leading-snug cursor-pointer [text-shadow:0_1px_2px_rgba(0,0,0,.5)] ${expanded ? "" : "line-clamp-2"}`}
            >
              {reel.caption}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-white/90 overflow-hidden">
            <Icon name="music" size={14} />
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <span className={`inline-block ${active && !paused ? "animate-[reelMarquee_9s_linear_infinite]" : ""}`}>{music}</span>
            </div>
            <span className="text-xs text-white/70 flex-shrink-0">{compact(reel.views)} views</span>
          </div>
        </div>

        {/* progress (click to seek) */}
        <div onClick={seek} className="absolute inset-x-0 bottom-0 h-3 flex items-end cursor-pointer group">
          <div className="w-full h-[3px] group-hover:h-[5px] bg-white/25 transition-[height]">
            <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// A reel's comment thread: the docked side panel on wide screens, or the
// slide-in drawer (mode="drawer") on narrow ones.
function ReelComments({ reel, onChange, onClose, mode = "panel", inputRef }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const drawer = mode === "drawer";

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && !/input|textarea/i.test(e.target.tagName) && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, onClose]);

  const body = (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-hx-border flex-shrink-0">
        <div className="cursor-pointer" onClick={() => navigate(`/profile/${reel.author?._id}`)}>
          <Avatar src={reel.author?.avatar} name={reel.author?.name} size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{reel.author?.name}</div>
          <div className="text-[13px] text-hx-text2 truncate">{reel.caption}</div>
        </div>
        {drawer && (
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn">
            <Icon name="x" size={20} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-[13px] text-hx-text2 border-b border-hx-border flex-shrink-0">
        <ReactionSummary summary={summarize(reel.reactionCounts, null, reel.myReaction)} text={compact(reel.reactionsCount)} size={16} />
        <span>
          {t("post.comments", { count: reel.commentsCount })} · {t("post.shares", { count: reel.sharesCount })}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <CommentSection
          ref={inputRef}
          variant="panel"
          basePath={`/reels/${reel._id}`}
          comments={reel.comments}
          onChange={onChange}
          emptyText={t("reels.noComments")}
        />
      </div>
    </>
  );

  if (!drawer) return <aside className="w-[380px] flex-shrink-0 bg-hx-card border-l border-hx-border flex flex-col min-h-0">{body}</aside>;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-hx-fade" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(400px,100vw)] h-full bg-hx-card text-hx-text shadow-hx-pop flex flex-col animate-[reelDrawer_.22s_ease-out]"
      >
        {body}
      </aside>
    </div>,
    document.body
  );
}

// Watch: vertical, snap-scrolling reels feed.
export default function Watch() {
  const { t } = useLanguage();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reels, setReels] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null); // drawer (narrow screens)
  const [sharing, setSharing] = useState(null);
  const docked = useMediaQuery("(min-width: 1100px)");
  const dockedInput = useRef(null);
  const scroller = useRef(null);
  const viewed = useRef(new Set());
  const loadingMore = useRef(false);

  // First page. A deep-linked reel that isn't on it (an older reel opened
  // from a share or a profile) is fetched on its own and shown first.
  useEffect(() => {
    const linked = params.get("reel");
    api
      .get("/reels", { params: { limit: 10 } })
      .then(async ({ data }) => {
        let list = data.reels;
        if (linked && !list.some((r) => r._id === linked)) {
          try {
            const { data: one } = await api.get(`/reels/${linked}`);
            list = [one.reel, ...list];
          } catch {
            // deleted or invalid link - just show the feed
          }
        }
        setReels(list);
        setCursor(data.nextCursor);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link: /watch?reel=<id> scrolls to that reel once loaded.
  useEffect(() => {
    const id = params.get("reel");
    if (!id || !reels.length) return;
    const i = reels.findIndex((r) => r._id === id);
    if (i > 0) scroller.current?.querySelector(`[data-index="${i}"]`)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels.length > 0]);

  // The reel that is at least 60% visible is the active (playing) one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.index))),
      { root, threshold: 0.6 }
    );
    root.querySelectorAll(".reel").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels.length, loading]);

  const current = reels[active];

  // One view per reel per visit; keep the URL pointing at the current reel.
  useEffect(() => {
    if (!current) return;
    if (!viewed.current.has(current._id)) {
      viewed.current.add(current._id);
      api.post(`/reels/${current._id}/view`).catch(() => {});
    }
    if (params.get("reel") !== current._id) setParams({ reel: current._id }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id]);

  // Load the next page when nearing the end.
  useEffect(() => {
    if (!cursor || loadingMore.current || active < reels.length - 3) return;
    loadingMore.current = true;
    api
      .get("/reels", { params: { limit: 10, before: cursor } })
      .then(({ data }) => {
        setReels((prev) => [...prev, ...data.reels.filter((r) => !prev.some((p) => p._id === r._id))]);
        setCursor(data.nextCursor);
      })
      .catch(() => {
        // keep what's loaded; the next scroll retries
      })
      .finally(() => (loadingMore.current = false));
  }, [active, cursor, reels.length]);

  const go = useCallback((delta) => {
    const root = scroller.current;
    if (root) root.scrollBy({ top: delta * root.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (commentsFor || sharing || isReportOpen() || /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "j") go(1);
      else if (e.key === "ArrowUp" || e.key === "k") go(-1);
      else if (e.key === "m") setMuted((m) => !m);
      else if (e.key === " ") ReelCard.toggleActive?.();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, commentsFor, sharing]);

  // After reels are removed from the list, keep the active index in range.
  useEffect(() => {
    if (reels.length && active > reels.length - 1) setActive(reels.length - 1);
  }, [reels.length, active]);

  // "Not interested" / "Mute author": drop the reel(s) now, persist on the
  // server, and offer Undo (which restores them where they were).
  const removeReels = async (predicate, request, undoRequest, notice) => {
    const before = reels;
    setReels((prev) => prev.filter((r) => !predicate(r)));
    try {
      await request();
      toast(notice, {
        label: t("reels.undo"),
        run: async () => {
          try {
            await undoRequest();
            // Removed reels go back in their old places; pages loaded since stay at the end.
            setReels((prev) => [
              ...before.filter((r) => predicate(r) || prev.some((p) => p._id === r._id)),
              ...prev.filter((p) => !before.some((r) => r._id === p._id)),
            ]);
          } catch {
            toast(t("reels.actionFailed"));
          }
        },
      });
    } catch {
      setReels(before);
      toast(t("reels.actionFailed"));
    }
  };

  const notInterested = (reel) =>
    removeReels(
      (r) => r._id === reel._id,
      () => api.post(`/reels/${reel._id}/not-interested`),
      () => api.delete(`/reels/${reel._id}/not-interested`),
      t("reels.hiddenNotice")
    );

  const muteAuthor = (author) =>
    removeReels(
      (r) => r.author?._id === author._id,
      () => api.post(`/reels/muted-authors/${author._id}`),
      () => api.delete(`/reels/muted-authors/${author._id}`),
      t("reels.mutedNotice", { name: author.name })
    );

  const patch = (id, changes) => setReels((prev) => prev.map((r) => (r._id === id ? { ...r, ...changes } : r)));

  // Optimistic reaction (same type again removes it), reconciled with the server.
  const react = async (reel, type) => {
    const prev = { reactionCounts: reel.reactionCounts, reactionsCount: reel.reactionsCount, myReaction: reel.myReaction };
    const counts = { ...reel.reactionCounts };
    let total = reel.reactionsCount;
    if (reel.myReaction) {
      counts[reel.myReaction] -= 1;
      total -= 1;
    }
    const next = type && type !== reel.myReaction ? type : null;
    if (next) {
      counts[next] = (counts[next] || 0) + 1;
      total += 1;
    }
    patch(reel._id, { reactionCounts: counts, reactionsCount: total, myReaction: next });
    try {
      const { data } = await api.post(`/reels/${reel._id}/react`, { type });
      patch(reel._id, data);
    } catch {
      patch(reel._id, prev);
    }
  };

  const openComments = (reel) => (docked ? dockedInput.current?.focus() : setCommentsFor(reel._id));
  const updateComments = (id) => (data) => {
    const comments = Array.isArray(data) ? data : data.comments;
    patch(id, { comments, commentsCount: comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0) });
  };

  const openReel = reels.find((r) => r._id === commentsFor);
  const sharingReel = reels.find((r) => r._id === sharing);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-hx-bg">
      <Header />
      {loading ? (
        <Loader />
      ) : reels.length === 0 ? (
        <div className="card max-w-md mx-auto mt-16 p-8 text-center text-hx-text2">
          {loadError ? t("reels.loadFailed") : t("reels.none")}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
        <div className="relative flex-1 min-w-0 min-h-0">
          <div ref={scroller} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
            {reels.map((reel, i) => (
              <ReelCard
                key={reel._id}
                reel={reel}
                index={i}
                active={i === active && !commentsFor && !sharing}
                near={Math.abs(i - active) <= 1}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onReact={(type) => react(reel, type)}
                onComments={() => openComments(reel)}
                onShare={() => setSharing(reel._id)}
                onNotInterested={notInterested}
                onMuteAuthor={muteAuthor}
              />
            ))}
          </div>

          <div className="hidden min-[700px]:flex flex-col gap-3 absolute right-6 top-1/2 -translate-y-1/2">
            <button onClick={() => go(-1)} disabled={active === 0} aria-label={t("reels.previous")} className="hx-icon-btn w-12 h-12 shadow-hx disabled:opacity-40">
              <Icon name="chevDown" size={24} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button onClick={() => go(1)} disabled={active >= reels.length - 1} aria-label={t("reels.next")} className="hx-icon-btn w-12 h-12 shadow-hx disabled:opacity-40">
              <Icon name="chevDown" size={24} />
            </button>
          </div>

        </div>
        {docked && current && <ReelComments key={current._id} reel={current} inputRef={dockedInput} onChange={updateComments(current._id)} />}
        </div>
      )}

      {!docked && openReel && (
        <ReelComments mode="drawer" reel={openReel} onClose={() => setCommentsFor(null)} onChange={updateComments(openReel._id)} />
      )}
      {sharingReel && (
        <ShareDialog
          kind="reel"
          item={sharingReel}
          onClose={() => setSharing(null)}
          onShared={(data) => patch(sharingReel._id, { sharesCount: data.sharesCount })}
        />
      )}
    </div>
  );
}

// Shared by all cards; set by whichever card is active.
ReelCard.toggleActive = null;
