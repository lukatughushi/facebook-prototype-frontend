import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useReport } from "../context/ReportContext";
import { firstName, timeAgo } from "../utils/format";
import { REACTION, summarize, toggleInList } from "../utils/reactions";
import Avatar from "./Avatar";
import Icon from "./Icon";
import EmojiPicker, { insertAtCursor } from "./EmojiPicker";
import MoreMenu from "./MoreMenu";
import ReactionPicker from "./reactions/ReactionPicker";
import ReactionSummary from "./reactions/ReactionSummary";

// Inline editor for the viewer's own comment: Enter saves, Esc cancels.
function CommentEditor({ initial, onSave, onCancel }) {
  const { t } = useLanguage();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = async () => {
    const value = text.trim();
    if (!value || saving) return;
    if (value === initial.trim()) return onCancel();
    setSaving(true);
    setError("");
    try {
      await onSave(value);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("comment.editFailed"));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        maxLength={500}
        disabled={saving}
        aria-label={t("comment.editLabel")}
        className="w-full h-9 rounded-[18px] bg-hx-input px-3 border border-hx-accent outline-none text-hx-text text-[15px]"
      />
      <div className="flex gap-2 text-xs px-3 text-hx-text2">
        <span>
          {t("comment.enterToSave")} ·{" "}
          <button onClick={onCancel} className="text-hx-accent font-semibold hover:underline">
            {t("common.cancel")}
          </button>
        </span>
      </div>
      {error && <div className="text-[13px] text-red-500 px-3">{error}</div>}
    </div>
  );
}

function CommentRow({ c, reply, userId, parent, onReact, onReply, onOpen, onEdit }) {
  const { t } = useLanguage();
  const report = useReport();
  const [editing, setEditing] = useState(false);
  const size = reply ? 24 : 32;
  const s = summarize(c.reactions || [], userId);
  const mine = s.mine ? REACTION[s.mine] : null;
  const canEdit = !!userId && c.author?._id === userId;

  if (editing) {
    return (
      <div className={`flex gap-1.5 items-start ${reply ? "ml-[38px]" : ""}`}>
        <div className="flex-shrink-0">
          <Avatar src={c.author?.avatar} name={c.author?.name || "?"} size={size} style={{ fontSize: reply ? 9 : 11 }} />
        </div>
        <CommentEditor
          initial={c.content}
          onCancel={() => setEditing(false)}
          onSave={async (text) => {
            await onEdit(text);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex gap-1.5 items-start ${reply ? "ml-[38px]" : ""}`}>
      <div className="cursor-pointer flex-shrink-0" onClick={onOpen}>
        <Avatar src={c.author?.avatar} name={c.author?.name || "?"} size={size} style={{ fontSize: reply ? 9 : 11 }} />
      </div>
      <div className="min-w-0 group/comment">
        <div className="flex items-center gap-1 max-w-full">
        <div className="relative bg-hx-input rounded-[18px] py-2 px-3 inline-block min-w-0 max-w-full">
          <div onClick={onOpen} className="font-semibold text-[13px] cursor-pointer hover:underline">
            {c.author?.name || t("admin.unknown")}
          </div>
          <div className="text-[15px] break-words whitespace-pre-wrap">{c.content}</div>
          {s.total > 0 && (
            <span className="absolute -right-3 -bottom-2.5 h-5 pl-0.5 pr-1.5 rounded-[10px] bg-hx-card shadow-hx flex items-center gap-1 text-[12px] text-hx-text2">
              <ReactionSummary summary={s} size={16} />
              {s.total > 1 && s.total}
            </span>
          )}
        </div>
        {userId && !canEdit && c._id && (
          <div className="opacity-100 min-[900px]:opacity-0 min-[900px]:group-hover/comment:opacity-100 focus-within:opacity-100 transition-opacity">
            <MoreMenu
              iconSize={16}
              buttonClass="w-8 h-8 rounded-full border-0 bg-transparent text-hx-text2 flex items-center justify-center cursor-pointer hover:bg-hx-hover"
              items={[{ icon: "flag", label: t("report.reportComment"), run: () => report({ contentType: "comment", targetId: c._id, ...parent }) }]}
            />
          </div>
        )}
        </div>
        <div className={`flex gap-3 text-xs font-bold text-hx-text2 px-3 ${s.total > 0 ? "pt-2" : "pt-0.5"}`}>
          <ReactionPicker onPick={onReact} size="sm">
            <button
              onClick={() => onReact(s.mine || "like")}
              className="font-bold hover:underline"
              style={{ color: mine ? mine.color : undefined }}
            >
              {mine ? (s.mine === "like" ? t("post.like") : mine.label) : t("post.like")}
            </button>
          </ReactionPicker>
          <button onClick={onReply} className="font-bold hover:underline">
            {t("comment.reply")}
          </button>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="font-bold hover:underline">
              {t("comment.edit")}
            </button>
          )}
          <span className="font-normal">{timeAgo(c.createdAt)}</span>
          {c.editedAt && (
            <span className="font-normal" title={new Date(c.editedAt).toLocaleString()}>
              {t("post.edited")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// A comment thread (comments, one level of replies, reactions on both) plus
// the "Write a comment…" input. Works for any resource that exposes
//   POST {basePath}/comment, {basePath}/comments/:id/reply, {basePath}/comments/:id/react,
//   PATCH {basePath}/comments/:id (edit your own comment or reply)
// - posts and reels. Every call returns the full comment list, handed back
// via onChange. variant="panel" fills its container with a scrolling list
// and the input pinned at the bottom (photo viewer, reel side panel).
// The forwarded ref exposes focus().
const CommentSection = forwardRef(function CommentSection({ basePath, comments, onChange, variant = "inline", emptyText }, ref) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, prefix }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const panel = variant === "panel";
  // The post/reel these comments belong to, attached to comment reports.
  const parentMatch = /^\/(post|reel)s\/([a-f0-9]{24})$/.exec(basePath || "");
  const parent = parentMatch ? { parentType: parentMatch[1], parentId: parentMatch[2] } : null;

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  // Reset the draft when switching to another post/reel.
  useEffect(() => {
    setDraft("");
    setReplyTo(null);
  }, [basePath]);

  const open = (c) => c.author?._id && navigate(`/profile/${c.author._id}`);

  // Optimistic reaction on a comment or reply, reconciled with the server.
  const react = async (commentId, type) => {
    const before = comments;
    const apply = (c) => (c._id === commentId ? { ...c, reactions: toggleInList(c.reactions || [], user._id, type) } : c);
    onChange(comments.map((c) => ({ ...apply(c), replies: (c.replies || []).map(apply) })));
    try {
      const { data } = await api.post(`${basePath}/comments/${commentId}/react`, { type });
      onChange(data.comments);
    } catch {
      onChange(before);
    }
  };

  // Throws on failure so the inline editor can show the error.
  const saveEdit = async (commentId, content) => {
    const { data } = await api.patch(`${basePath}/comments/${commentId}`, { content });
    onChange(data.comments);
  };

  const startReply = (comment, target) => {
    const prefix = `@${firstName(target.author?.name)} `;
    setReplyTo({ id: comment._id, prefix });
    setDraft(prefix);
    setTimeout(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(prefix.length, prefix.length);
    }, 30);
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || submitting) return;
    // Deleting the @mention turns a reply back into a top-level comment.
    const asReply = replyTo && draft.startsWith(replyTo.prefix.trim());
    setSubmitting(true);
    setError("");
    try {
      const url = asReply ? `${basePath}/comments/${replyTo.id}/reply` : `${basePath}/comment`;
      const { data } = await api.post(url, { content: text });
      onChange(data.comments);
      setDraft("");
      setReplyTo(null);
      if (panel && !asReply) setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch {
      // keep the typed text so the user can retry
      setError(t("comment.postFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const list = (
    <>
      {comments.length === 0 && emptyText && <p className="text-center text-hx-text2 py-6">{emptyText}</p>}
      {comments.map((c) => (
        <div key={c._id} className="flex flex-col gap-2.5">
          <CommentRow
            c={c}
            userId={user?._id}
            parent={parent}
            onOpen={() => open(c)}
            onReact={(type) => react(c._id, type)}
            onReply={() => startReply(c, c)}
            onEdit={(text) => saveEdit(c._id, text)}
          />
          {(c.replies || []).map((rp) => (
            <CommentRow
              key={rp._id}
              c={rp}
              reply
              userId={user?._id}
              parent={parent}
              onOpen={() => open(rp)}
              onReact={(type) => react(rp._id, type)}
              onReply={() => startReply(c, rp)}
              onEdit={(text) => saveEdit(rp._id, text)}
            />
          ))}
        </div>
      ))}
    </>
  );

  const input = (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5 items-center">
        <Avatar src={user?.avatar} name={user?.name} size={32} style={{ fontSize: 11 }} />
        <div className="flex-1 min-w-0 min-h-9 rounded-[18px] bg-hx-input flex items-center pr-1.5 pl-3 gap-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape" && replyTo) {
                e.stopPropagation();
                setReplyTo(null);
                setDraft("");
              }
            }}
            placeholder={replyTo ? t("comment.writeReply") : t("comment.write")}
            maxLength={500}
            className="flex-1 min-w-0 h-9 border-0 outline-none bg-transparent text-hx-text text-[15px]"
          />
          <EmojiPicker small label={t("chat.emoji")} onSelect={(emoji) => setDraft(insertAtCursor(inputRef.current, draft, emoji, 500))} />
          <button
            onClick={submit}
            aria-label={t("chat.send")}
            disabled={submitting}
            className="w-7 h-7 rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: draft.trim() ? "rgb(var(--accent))" : "rgb(var(--text2))" }}
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
      {error && <div className="text-[13px] text-red-500 pl-10">{error}</div>}
    </div>
  );

  if (panel) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3.5">
          {list}
        </div>
        <div className="px-4 py-3 border-t border-hx-border flex-shrink-0">{input}</div>
      </div>
    );
  }

  return (
    <div className="pt-2 px-4 pb-3 flex flex-col gap-3 animate-hx-fade">
      {list}
      {input}
    </div>
  );
});

export default CommentSection;
