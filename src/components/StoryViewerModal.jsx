import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { StoryImage } from "./StoriesBar";
import { colorFor, firstName } from "../utils/format";
import { useLanguage } from "../context/LanguageContext";

const SLIDE_DURATION_MS = 5000;

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

const roundBtn =
  "rounded-full border-0 bg-white/[0.12] hover:bg-white/[0.22] text-white flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors";

// Full-screen story viewer, grouped per author with auto-progressing slides:
// each story plays for SLIDE_DURATION_MS, then the next person's stories.
// Keyboard: Esc closes, Left/Right step. `onViewed(storyId)` marks seen.
// The ⋮ menu offers "Delete story" (own stories) or "Mute <name>" (others').
// `onDeleted(storyId, nextStoryId)` / `onMuted(authorId, nextStoryId)` let
// the parent drop the stories; the viewer then moves on to nextStoryId
// (null = nothing left, the parent closes it).
export default function StoryViewerModal({ groups, groupIndex, onNavigateGroup, onClose, onDeleted, onMuted, onViewed }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [actionError, setActionError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false); // a delete/mute request is in flight
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  // Story to jump to once the parent has removed deleted/muted stories.
  const pendingRef = useRef(null);
  const paused = menuOpen || confirming || busy;

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const goToGroup = (nextGroupIndex) => {
    if (nextGroupIndex < 0 || nextGroupIndex >= groups.length) {
      onClose();
      return;
    }
    setStoryIndex(0);
    onNavigateGroup(nextGroupIndex);
  };

  const goNext = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) setStoryIndex((i) => i + 1);
    else goToGroup(groupIndex + 1);
  };

  const goPrev = () => {
    if (!group) return;
    if (storyIndex > 0) setStoryIndex((i) => i - 1);
    else if (groupIndex > 0) goToGroup(groupIndex - 1);
  };

  useEffect(() => {
    if (story) onViewed?.(story._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?._id]);

  // After a delete or mute, the groups are rebuilt (and possibly re-sorted), so find
  // the next story by id rather than by index.
  useEffect(() => {
    const target = pendingRef.current;
    if (!target) return;
    const gi = groups.findIndex((g) => g.stories.some((s) => s._id === target));
    if (gi === -1) return;
    pendingRef.current = null;
    setStoryIndex(groups[gi].stories.findIndex((s) => s._id === target));
    onNavigateGroup(gi);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // New story: restart the progress bar.
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setActionError("");
    setMenuOpen(false);
    setConfirming(false);
  }, [groupIndex, storyIndex, story?._id]);

  // Auto-progress, driven by requestAnimationFrame for a smooth bar. Paused
  // (keeping its position) while the menu or delete confirmation is open or a
  // request is in flight.
  useEffect(() => {
    if (paused || !story) return;
    startRef.current = performance.now() - elapsedRef.current;

    const tick = (now) => {
      elapsedRef.current = now - startRef.current;
      const pct = Math.min(100, (elapsedRef.current / SLIDE_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
      else rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, story?._id, paused]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (busy) return;
      if (confirming || menuOpen) {
        if (e.key === "Escape") {
          setConfirming(false);
          setMenuOpen(false);
        }
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, groups.length, confirming, menuOpen, busy]);

  if (!group || !story) return null;

  const author = story.author;
  const isOwner = !!user?._id && author?._id === user._id;

  // The first story after the current one (in viewing order) that survives
  // the removal, else the closest one before it, else null.
  const nextSurvivor = (isRemoved) => {
    const order = groups.flatMap((g) => g.stories);
    const at = order.findIndex((s) => s._id === story._id);
    const after = order.slice(at + 1).find((s) => !isRemoved(s));
    const before = order.slice(0, at).reverse().find((s) => !isRemoved(s));
    return (after || before)?._id || null;
  };

  // Runs a delete/mute request, then hands the result to the parent.
  const run = async (request, isRemoved, notify, fallback) => {
    setMenuOpen(false);
    setBusy(true);
    setActionError("");
    try {
      await request();
    } catch (err) {
      setBusy(false);
      setConfirming(false);
      setActionError(err.response?.data?.message || fallback);
      return;
    }
    const nextId = nextSurvivor(isRemoved);
    pendingRef.current = nextId;
    notify(nextId);
  };

  const handleDelete = () =>
    run(
      () => api.delete(`/stories/${story._id}`),
      (s) => s._id === story._id,
      (nextId) => onDeleted?.(story._id, nextId),
      t("stories.deleteFailed")
    );

  const handleMute = () =>
    run(
      () => api.post(`/stories/mute/${author._id}`),
      (s) => s.author?._id === author._id,
      (nextId) => onMuted?.(author._id, nextId),
      t("stories.muteFailed")
    );

  const menuRow = "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left font-medium text-[15px] hover:bg-hx-hover";

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-[#0e0f10] flex items-center justify-center animate-hx-fade">
      <button onClick={onClose} aria-label={t("common.close")} className={`${roundBtn} absolute z-30 top-[22px] right-12 sm:top-4 sm:right-4 w-10 h-10`}>
        <Icon name="x" size={20} />
      </button>

      <button onClick={goPrev} aria-label={t("common.previous")} className={`${roundBtn} hidden sm:flex w-12 h-12 mr-4`}>
        <Icon name="chevLeft" size={22} />
      </button>

      <div
        className="relative w-full h-full sm:w-auto sm:h-[min(86vh,760px)] sm:aspect-[9/16] sm:max-w-[calc(100vw-150px)] sm:rounded-xl overflow-hidden"
        style={{ background: colorFor(story.author?.name) }}
      >
        <StoryImage key={story.image} src={story.image} className="absolute inset-0 w-full h-full object-cover" />
        {/* Phones: the story fills the screen; tap the left third to go back,
            anywhere else to go forward (the arrow buttons are hidden). */}
        <button type="button" onClick={goPrev} aria-label={t("common.previous")} className="sm:hidden absolute inset-y-0 left-0 w-1/3" />
        <button type="button" onClick={goNext} aria-label={t("common.next")} className="sm:hidden absolute inset-y-0 right-0 w-2/3" />
        <div className="absolute inset-x-0 top-0 h-[120px] bg-[linear-gradient(180deg,rgba(0,0,0,0.5),rgba(0,0,0,0))] pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex gap-1 pointer-events-none">
          {group.stories.map((s, i) => (
            <div key={s._id} className="flex-1 h-[3px] rounded-sm bg-white/[0.35] overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-[26px] left-3 right-24 sm:right-12 flex items-center gap-2 text-white pointer-events-none min-w-0">
          <span className="rounded-full border-2 border-white flex-shrink-0">
            <Avatar src={author?.avatar} name={author?.name} size={36} />
          </span>
          <div className="font-semibold truncate">{author?.name}</div>
          <div className="opacity-80 text-[13px] flex-shrink-0">{timeAgo(story.createdAt)}</div>
        </div>

        {author?._id && (isOwner || onMuted) && (
          <div className="absolute top-[24px] right-2 z-20">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy}
              aria-label={t("stories.options")}
              aria-expanded={menuOpen}
              className="w-10 h-10 rounded-full border-0 bg-transparent hover:bg-white/[0.15] text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <Icon name="moreV" size={22} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="panel absolute right-0 top-11 w-[240px] p-1.5 text-hx-text">
                  {isOwner ? (
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirming(true);
                      }}
                      className={menuRow}
                    >
                      <Icon name="trash" size={20} /> <span>{t("stories.delete")}</span>
                    </button>
                  ) : (
                    <button role="menuitem" onClick={handleMute} className={menuRow}>
                      <Icon name="volumeX" size={20} />
                      <span className="min-w-0">
                        <span className="block truncate">{t("stories.mute", { name: firstName(author.name) })}</span>
                        <span className="block text-[12px] font-normal text-hx-text2">{t("stories.muteHint")}</span>
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {confirming && (
          <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-xl bg-hx-card text-hx-text p-4 flex flex-col gap-3 text-center">
              <div className="font-semibold text-[17px]">{t("stories.deleteTitle")}</div>
              <div className="text-[14px] text-hx-text2">{t("stories.deleteText")}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="hx-btn flex-1 bg-hx-btn text-hx-text hover:bg-hx-btnh"
                >
                  {t("common.cancel")}
                </button>
                <button onClick={handleDelete} disabled={busy} className="hx-btn flex-1 bg-[#e41e3f] text-white hover:brightness-95">
                  {busy ? t("common.deleting") : t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        )}

        {actionError && (
          <div className="absolute top-[72px] inset-x-3 rounded-lg bg-black/70 text-white text-[13px] text-center px-3 py-2">
            {actionError}
          </div>
        )}

        {story.text && (
          <div className="absolute bottom-6 left-4 right-4 text-center text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {story.text}
          </div>
        )}
      </div>

      <button onClick={goNext} aria-label={t("common.next")} className={`${roundBtn} hidden sm:flex w-12 h-12 ml-4`}>
        <Icon name="chevRight" size={22} />
      </button>
    </div>,
    document.body
  );
}
