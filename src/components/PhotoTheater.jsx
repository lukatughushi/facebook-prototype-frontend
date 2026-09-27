import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import resolveImage from "../utils/resolveImage";
import { useAuth } from "../context/AuthContext";
import usePostActions from "../hooks/usePostActions";
import Icon from "./Icon";
import CommentSection from "./CommentSection";
import ShareDialog from "./ShareDialog";
import ReactionsDialog from "./reactions/ReactionsDialog";
import { PostActions, PostHeader } from "./PostCard";
import { useLanguage } from "../context/LanguageContext";
import { useReport, useToast } from "../context/ReportContext";
import MoreMenu from "./MoreMenu";
import { isReportOpen } from "./ReportModal";

// Full-screen photo viewer with the post's reactions and full comment thread
// on the right (below on narrow screens). `posts` are the photo posts to
// page through; their state lives in the feed (onUpdate(id, patch)).
// Keyboard: Esc closes, arrows move between photos - unless typing.
export default function PhotoTheater({ posts, startId, onClose, onUpdate, onShared }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const report = useReport();
  const toast = useToast();
  const [id, setId] = useState(startId);
  const [sharing, setSharing] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const commentsRef = useRef(null);

  const index = Math.max(0, posts.findIndex((p) => p._id === id));
  const post = posts[index];
  const actions = usePostActions(post || {}, (patch) => onUpdate(post._id, patch));
  const total = posts.length;
  const step = (d) => total > 1 && setId(posts[(index + d + total) % total]._id);

  useEffect(() => {
    const onKey = (e) => {
      if (sharing || reactionsOpen || isReportOpen()) return; // the dialog on top handles keys
      const typing = /input|textarea/i.test(e.target.tagName);
      if (e.key === "Escape") {
        if (typing) e.target.blur();
        else onClose();
      } else if (!typing && e.key === "ArrowRight") step(1);
      else if (!typing && e.key === "ArrowLeft") step(-1);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, sharing, reactionsOpen, onClose]);

  if (!post) return null;

  const navBtn =
    "absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("post.photoViewer")} className="fixed inset-0 z-[80] flex flex-col min-[900px]:flex-row bg-black animate-hx-fade">
      <div className="relative flex-shrink-0 h-[55vh] min-[900px]:h-auto min-[900px]:flex-1 flex items-center justify-center">
        <img
          key={post._id}
          src={resolveImage(post.image)}
          alt={post.content ? post.content.slice(0, 80) : t("feed.photo")}
          // Profile/cover photos are often small (seeded avatars are 128px):
          // scale them up to fill the stage like the rest of the viewer.
          className={`max-w-full max-h-full object-contain select-none animate-hx-fade ${
            post.profileUpdate ? "w-full h-full" : ""
          }`}
        />
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
        >
          <Icon name="x" size={20} />
        </button>
        {total > 1 && (
          <>
            <button onClick={() => step(-1)} aria-label={t("common.previousPhoto")} className={`${navBtn} left-4`}>
              <Icon name="chevLeft" size={22} />
            </button>
            <button onClick={() => step(1)} aria-label={t("common.nextPhoto")} className={`${navBtn} right-4`}>
              <Icon name="chevRight" size={22} />
            </button>
            <div className="absolute bottom-4 inset-x-0 text-center text-white/80 text-[13px] pointer-events-none">
              {t("common.nOfTotal", { n: index + 1, total })}
            </div>
          </>
        )}
      </div>

      <aside className="flex-1 min-h-0 min-[900px]:flex-none min-[900px]:w-[380px] bg-hx-card text-hx-text flex flex-col">
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <PostHeader post={post}>
            <MoreMenu
              items={[
                {
                  icon: "link",
                  label: t("post.copyLink"),
                  run: () =>
                    navigator.clipboard
                      .writeText(`${window.location.origin}/posts/${post._id}`)
                      .then(() => toast(t("post.linkCopied")), () => toast(t("post.copyFailed"))),
                },
                post.author?._id !== user?._id && {
                  icon: "flag",
                  label: t("report.reportPhoto"),
                  run: () => report({ contentType: "photo", targetId: post._id }),
                },
              ]}
            />
          </PostHeader>
          {post.content && <div className="mt-3 text-[15px] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{post.content}</div>}
        </div>
        <div className="flex-shrink-0">
          <PostActions
            post={post}
            actions={actions}
            onComment={() => commentsRef.current?.focus()}
            onShare={() => setSharing(true)}
            onToggleComments={() => commentsRef.current?.focus()}
            onShowReactions={() => setReactionsOpen(true)}
          />
          <div className="mx-4 h-px bg-hx-border" />
        </div>
        <div className="flex-1 min-h-0">
          <CommentSection
            ref={commentsRef}
            variant="panel"
            basePath={`/posts/${post._id}`}
            comments={post.comments || []}
            onChange={(comments) => onUpdate(post._id, { comments })}
            emptyText={t("post.noComments")}
          />
        </div>
      </aside>

      {reactionsOpen && <ReactionsDialog postId={post._id} onClose={() => setReactionsOpen(false)} />}
      {sharing && (
        <ShareDialog
          kind="post"
          item={post}
          onClose={() => setSharing(false)}
          onShared={(data) => {
            if (!("sharedPost" in post)) onUpdate(post._id, (p) => ({ shares: [...(p.shares || []), user._id] }));
            onShared?.(data);
          }}
        />
      )}
    </div>,
    document.body
  );
}
