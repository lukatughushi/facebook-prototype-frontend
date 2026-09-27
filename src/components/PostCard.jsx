import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useReport } from "../context/ReportContext";
import { timeAgo } from "../utils/format";
import resolveImage from "../utils/resolveImage";
import { reactionText } from "../utils/reactions";
import usePostActions from "../hooks/usePostActions";
import Avatar from "./Avatar";
import Icon from "./Icon";
import CommentSection from "./CommentSection";
import PostModal from "./PostModal";
import ShareDialog from "./ShareDialog";
import SharedContent from "./SharedContent";
import ReactButton from "./reactions/ReactButton";
import ReactionSummary from "./reactions/ReactionSummary";
import ReactionsDialog from "./reactions/ReactionsDialog";

// Posted-by line shared by the card and the photo viewer: avatar, name
// (page instead of admin for page posts), "in Group" or "shared a post",
// time and audience.
export function PostHeader({ post, hideGroup, children }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const author = post.author || { name: t("admin.unknown") };
  const page = post.page && typeof post.page === "object" ? post.page : null;
  const group = !hideGroup && post.group && typeof post.group === "object" ? post.group : null;
  const poster = page || author;
  const openPoster = () => (page ? navigate(`/pages/${page._id}`) : author._id && navigate(`/profile/${author._id}`));
  const audience = post.audience || "Public";
  const sharedWhat = "sharedReel" in post ? "post.sharedReel" : "sharedPost" in post ? "post.sharedPost" : null;

  return (
    <div className="flex items-center gap-2">
      <div onClick={openPoster} className="cursor-pointer transition hover:brightness-110 flex-shrink-0">
        <Avatar src={poster.avatar} name={poster.name} size={40} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] leading-snug">
          <span onClick={openPoster} className="cursor-pointer hover:underline">
            {poster.name}
          </span>
          {sharedWhat && <span className="text-hx-text2 font-normal"> {t(sharedWhat)}</span>}
          {post.profileUpdate && (
            <span className="text-hx-text2 font-normal"> {t(post.profileUpdate === "avatar" ? "post.updatedAvatar" : "post.updatedCover")}</span>
          )}
          {group && (
            <>
              <span className="text-hx-text2 font-normal"> {t("post.inGroup")} </span>
              <span onClick={() => navigate(`/groups/${group._id}`)} className="cursor-pointer hover:underline">
                {group.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[13px] text-hx-text2">
          <span title={new Date(post.createdAt).toLocaleString()}>{timeAgo(post.createdAt)}</span>
          {post.editedAt && <span title={new Date(post.editedAt).toLocaleString()}>{t("post.edited")}</span>}
          <span>·</span>
          <span title={audience === "Public" ? t("post.audiencePublic") : t("post.audienceFriends")}>
            <Icon name={audience === "Public" ? "globe" : "users"} size={12} />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

// Reactions summary (click: who reacted) + comment/share counts, then
// Like / Comment / Share.
export function PostActions({ post, actions, onComment, onShare, onToggleComments, onShowReactions }) {
  const { summary, react, commentCount, shareCount } = actions;
  const { t } = useLanguage();
  const actionBtn =
    "flex-1 h-9 border-0 rounded bg-transparent flex items-center justify-center gap-2 cursor-pointer font-semibold text-[15px] text-hx-text2 transition-colors hover:bg-hx-hover";
  return (
    <>
      <div className="flex items-center justify-between py-2.5 px-4 text-hx-text2 text-[15px] gap-2">
        {summary.total > 0 ? (
          <button type="button" onClick={onShowReactions} disabled={!post._id} className="min-w-0 flex">
            <ReactionSummary summary={summary} text={reactionText(summary)} className="cursor-pointer hover:underline" />
          </button>
        ) : (
          <span className="text-[13px]">{t("post.beFirst")}</span>
        )}
        <div className="flex gap-3 flex-shrink-0">
          {commentCount > 0 && (
            <button onClick={onToggleComments} className="hover:underline">
              {t("post.comments", { count: commentCount })}
            </button>
          )}
          {shareCount > 0 && <span>{t("post.shares", { count: shareCount })}</span>}
        </div>
      </div>
      <div className="mx-4 h-px bg-hx-border" />
      <div className="flex gap-1 py-1 px-3">
        <ReactButton mine={summary.mine} onReact={react} />
        <button onClick={onComment} className={actionBtn}>
          <Icon name="comment" size={18} />
          <span>{t("post.comment")}</span>
        </button>
        <button onClick={onShare} className={actionBtn} disabled={!post._id}>
          <Icon name="share" size={18} />
          <span>{t("post.share")}</span>
        </button>
      </div>
    </>
  );
}

// A feed/profile post. Its reactions/comments/shares live in the parent feed
// (onUpdate patches them), so the photo viewer and card stay in sync.
// onOpenPhoto(post) opens the photo viewer; onShared({ post }) receives the
// share post the user just created.
export default function PostCard({ post, onUpdate, onDeleted, onOpenPhoto, onShared, hideGroup, initialComments = false }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const report = useReport();
  const actions = usePostActions(post, onUpdate);
  const [showComments, setShowComments] = useState(initialComments);
  const [menu, setMenu] = useState(null); // null | "open" | "confirm-delete"
  const [editOpen, setEditOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [notice, setNotice] = useState(""); // brief feedback: "Link copied", errors
  const commentsRef = useRef(null);
  const noticeTimer = useRef(null);

  const isOwner = user?._id === post.author?._id;
  const canManage = isOwner || user?.role === "admin";
  const saved = (user?.savedPosts || []).includes(post._id);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const flash = (text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  };

  const handleDelete = async () => {
    setMenu(null);
    try {
      await api.delete(`/posts/${post._id}`);
      onDeleted?.(post._id);
    } catch (err) {
      flash(err.response?.data?.message || t("post.deleteFailed"));
    }
  };

  // Optimistic toggle of the post in the viewer's saved list.
  const toggleSave = async () => {
    setMenu(null);
    const before = user.savedPosts || [];
    updateUser({ savedPosts: saved ? before.filter((id) => id !== post._id) : [post._id, ...before] });
    try {
      await api.post(`/posts/${post._id}/save`);
      flash(saved ? t("post.unsaved") : t("post.savedNotice"));
    } catch {
      updateUser({ savedPosts: before });
      flash(t("post.saveFailed"));
    }
  };

  const copyLink = async () => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`);
      flash(t("post.linkCopied"));
    } catch {
      flash(t("post.copyFailed"));
    }
  };

  const menuRow = "flex items-center gap-3 w-full p-2 rounded-md cursor-pointer font-medium text-left hover:bg-hx-hover";

  const focusComment = () => {
    setShowComments(true);
    setTimeout(() => commentsRef.current?.focus(), 30);
  };

  const isShare = "sharedPost" in post || "sharedReel" in post;
  const bigText = !post.image && !isShare && post.content && post.content.length < 90;

  return (
    <article className="card animate-[hxFade_.3s_ease]">
      <div className="pt-3 px-4">
        <PostHeader post={post} hideGroup={hideGroup}>
          {post._id && (
            <div className="relative">
              <button
                onClick={() => setMenu((m) => (m ? null : "open"))}
                aria-label={t("post.more")}
                className="w-9 h-9 rounded-full border-0 bg-transparent text-hx-text2 flex items-center justify-center cursor-pointer hover:bg-hx-hover"
              >
                <Icon name="more" size={20} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-[9]" onClick={() => setMenu(null)} />
                  <div className="panel absolute right-0 top-10 w-60 p-2 z-10">
                    {menu === "open" ? (
                      <>
                        <button onClick={toggleSave} className={menuRow}>
                          <Icon name={saved ? "bookmarkOff" : "bookmark"} size={20} /> <span>{saved ? t("post.unsave") : t("post.save")}</span>
                        </button>
                        <button onClick={copyLink} className={menuRow}>
                          <Icon name="link" size={20} /> <span>{t("post.copyLink")}</span>
                        </button>
                        {isOwner && !isShare && (
                          <button
                            onClick={() => {
                              setMenu(null);
                              setEditOpen(true);
                            }}
                            className={menuRow}
                          >
                            <Icon name="pen" size={20} /> <span>{t("post.edit")}</span>
                          </button>
                        )}
                        {!isOwner && (
                          <button
                            onClick={() => {
                              setMenu(null);
                              report({ contentType: "post", targetId: post._id });
                            }}
                            className={menuRow}
                          >
                            <Icon name="flag" size={20} /> <span>{t("report.reportPost")}</span>
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => setMenu("confirm-delete")} className={menuRow}>
                            <Icon name="trash" size={20} /> <span>{t("post.delete")}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="p-2">
                        <p className="font-semibold mb-1">{t("post.deleteTitle")}</p>
                        <p className="text-[13px] text-hx-text2 mb-3">{t("post.cannotUndo")}</p>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setMenu(null)} className="hx-btn text-hx-accent hover:bg-hx-hover">
                            {t("common.cancel")}
                          </button>
                          <button onClick={handleDelete} className="hx-btn bg-hx-accent text-white hover:brightness-95">
                            {t("common.delete")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </PostHeader>
      </div>

      {post.content ? (
        <div className="pt-1 px-4 pb-3 leading-[1.34] whitespace-pre-wrap break-words" style={{ fontSize: bigText ? 24 : 15 }}>
          {post.content}
        </div>
      ) : (
        <div className="h-3" />
      )}

      {post.image && post.profileUpdate === "avatar" ? (
        <div className="relative w-full py-6 flex justify-center bg-[linear-gradient(180deg,rgb(var(--input)),rgb(var(--card)))] border-y border-hx-border">
          <button
            type="button"
            onClick={() => onOpenPhoto?.(post)}
            aria-label={t("post.viewFullSize")}
            className="w-[min(320px,70%)] aspect-square rounded-full overflow-hidden border-4 border-hx-card shadow-hx cursor-zoom-in"
          >
            <img src={resolveImage(post.image)} alt={t("post.attachment")} className="w-full h-full object-cover" />
          </button>
        </div>
      ) : post.image && (
        <div className="relative w-full bg-hx-input border-y border-hx-border">
          <img
            src={resolveImage(post.image)}
            alt={t("post.attachment")}
            onClick={() => onOpenPhoto?.(post)}
            className="block w-full max-h-[680px] object-cover cursor-zoom-in"
          />
          <button
            onClick={() => onOpenPhoto?.(post)}
            aria-label={t("post.viewFullSize")}
            className="absolute top-3 right-3 w-9 h-9 rounded-full border-0 bg-black/55 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon name="expand" size={14} />
          </button>
        </div>
      )}

      {isShare && <SharedContent post={post} />}

      <PostActions
        post={post}
        actions={actions}
        onComment={focusComment}
        onShare={() => setSharing(true)}
        onToggleComments={() => setShowComments((s) => !s)}
        onShowReactions={() => setReactionsOpen(true)}
      />

      {notice && (
        <div role="status" className="mx-4 mb-2 px-3 py-2 rounded-md bg-hx-input text-[13px] text-hx-text animate-hx-fade">
          {notice}
        </div>
      )}

      {showComments && (
        <>
          <div className="mx-4 h-px bg-hx-border" />
          <CommentSection
            ref={commentsRef}
            basePath={`/posts/${post._id}`}
            comments={post.comments || []}
            onChange={(comments) => onUpdate({ comments })}
          />
        </>
      )}

      {editOpen && (
        <PostModal mode="edit" post={post} onClose={() => setEditOpen(false)} onUpdated={(updated) => onUpdate({ content: updated.content, editedAt: updated.editedAt })} />
      )}

      {reactionsOpen && <ReactionsDialog postId={post._id} onClose={() => setReactionsOpen(false)} />}

      {sharing && (
        <ShareDialog
          kind="post"
          item={post}
          onClose={() => setSharing(false)}
          onShared={(data) => {
            // The share counter belongs to the original, which may be this post.
            if (!isShare) onUpdate({ shares: [...(post.shares || []), user._id] });
            onShared?.(data);
          }}
        />
      )}
    </article>
  );
}
