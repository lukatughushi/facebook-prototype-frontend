import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { firstName, formatPrice } from "../utils/format";
import { locale, useLanguage } from "../context/LanguageContext";
import resolveImage from "../utils/resolveImage";
import Avatar from "./Avatar";
import Icon from "./Icon";
import EmojiPicker, { insertAtCursor } from "./EmojiPicker";

// Compact Marketplace listing card, shown above a message that references
// it and as the banner of a chat opened with "Message seller".
function ListingChip({ item, onOpen }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2 w-full max-w-[240px] p-1.5 rounded-xl border border-hx-border bg-hx-card text-left hover:bg-hx-hover"
    >
      <img src={resolveImage(item.imageUrls?.[0])} alt="" className="w-10 h-10 rounded-lg object-cover bg-hx-input flex-shrink-0" />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold truncate text-hx-text">{item.title}</span>
        <span className="block text-xs text-hx-text2">
          {formatPrice(item.price)}
          {item.status === "sold" && ` · ${t("marketplace.sold")}`}
        </span>
      </span>
    </button>
  );
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
}

// A single floating chat window docked at the bottom-right. Loads the
// conversation from GET /messages/:id, sends via POST, receives live
// messages over the socket, and marks the thread read while expanded.
// `friend.item` (from Marketplace) pre-fills an enquiry about that listing.
export default function ChatWindow({ friend, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const listing = friend.item;
  const { socket, isOnline } = useSocket();
  const online = isOnline(friend._id);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/messages/${friend._id}`)
      .then(({ data }) => !cancelled && setMessages(data.messages))
      .catch((err) => !cancelled && setError(err.response?.data?.message || t("chat.loadFailed")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [friend._id]);

  useEffect(() => {
    if (!socket) return;
    const onNewMessage = ({ message }) => {
      const senderId = message.sender?._id;
      const belongsHere =
        (senderId === friend._id && message.receiver === user._id) ||
        (senderId === user._id && message.receiver === friend._id);
      if (!belongsHere) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    };
    socket.on("newMessage", onNewMessage);
    return () => socket.off("newMessage", onNewMessage);
  }, [socket, friend._id, user._id]);

  // Anything from the friend that's visible in an expanded window is read.
  const lastIncomingId = [...messages].reverse().find((m) => m.sender?._id === friend._id)?._id;
  useEffect(() => {
    if (minimized || loading || error) return;
    api.patch(`/messages/${friend._id}/read`).catch(() => {});
  }, [friend._id, minimized, loading, error, lastIncomingId]);

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, minimized]);

  useEffect(() => {
    if (!minimized) inputRef.current?.focus();
  }, [minimized]);

  // The first message about a listing carries its id, which is also what lets
  // a buyer message a seller who isn't a friend.
  const listingPending = !!listing && !messages.some((m) => (m.item?._id || m.item) === listing._id);
  useEffect(() => {
    if (!loading && listingPending) setText((prev) => prev || t("chat.stillAvailable"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, listing?._id]);

  const openListing = (item) => navigate(`/marketplace?item=${item._id}`);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");
    try {
      const { data } = await api.post(`/messages/${friend._id}`, {
        text: trimmed,
        ...(listingPending ? { itemId: listing._id } : {}),
      });
      setMessages((prev) => (prev.some((m) => m._id === data.message._id) ? prev : [...prev, data.message]));
    } catch (err) {
      setText(trimmed);
      setError(err.response?.data?.message || t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const headerBtn =
    "h-8 w-8 flex items-center justify-center rounded-full text-hx-accent hover:bg-hx-hover transition-colors";

  return (
    <div
      className={`w-[328px] max-w-[calc(100vw-16px)] bg-hx-card rounded-t-lg shadow-hx-pop flex flex-col overflow-hidden animate-hx-rise ${
        minimized ? "" : "h-[455px] max-h-[calc(100vh-72px)]"
      }`}
    >
      <div className="flex items-center gap-1 px-2 h-12 flex-shrink-0 border-b border-hx-border shadow-hx">
        <Link to={`/profile/${friend._id}`} className="flex items-center gap-2 min-w-0 flex-1 rounded-md p-1 hover:bg-hx-hover">
          <Avatar src={friend.avatar} name={friend.name} size={32} online={online} />
          <span className="min-w-0">
            <span className="block font-semibold text-[15px] truncate text-hx-text">{friend.name}</span>
            {online && <span className="block text-xs text-hx-text2 leading-tight">{t("chat.activeNow")}</span>}
          </span>
        </Link>
        <button onClick={() => setMinimized((m) => !m)} aria-label={minimized ? t("chat.expand") : t("chat.minimize")} className={headerBtn}>
          <Icon name="minus" size={18} />
        </button>
        <button onClick={onClose} aria-label={t("chat.close")} className={headerBtn}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {!minimized && listingPending && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-hx-border bg-hx-bg/40 animate-hx-fade">
          <span className="text-xs text-hx-text2 flex-shrink-0">{t("chat.about")}</span>
          <ListingChip item={listing} onOpen={() => openListing(listing)} />
        </div>
      )}

      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {loading ? (
              <p className="text-center text-[13px] text-hx-text2 py-6">{t("common.loading")}</p>
            ) : messages.length === 0 && !error ? (
              <div className="flex flex-col items-center text-center gap-2 py-6">
                <Avatar src={friend.avatar} name={friend.name} size={56} />
                <p className="font-semibold">{friend.name}</p>
                <p className="text-[13px] text-hx-text2">
                  {listing ? t("chat.askAbout", { name: firstName(friend.name) }) : t("chat.sayHi", { name: firstName(friend.name) })}
                </p>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = m.sender?._id === user._id;
                const nextSame = messages[i + 1]?.sender?._id === m.sender?._id;
                return (
                  <div key={m._id}>
                  {m.item?._id && (
                    <div className={`flex mb-1 ${mine ? "justify-end" : "justify-start pl-9"}`}>
                      <ListingChip item={m.item} onOpen={() => openListing(m.item)} />
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && (
                      <span className="w-7 flex-shrink-0">
                        {!nextSame && <Avatar src={friend.avatar} name={friend.name} size={28} />}
                      </span>
                    )}
                    <div
                      title={formatTime(m.createdAt)}
                      className={`max-w-[75%] rounded-[18px] px-3 py-2 text-[15px] break-words whitespace-pre-wrap ${
                        mine ? "bg-hx-accent text-white" : "bg-hx-input text-hx-text"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                  </div>
                );
              })
            )}
            {error && <p className="text-center text-[13px] text-red-500 py-2">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-1 p-2 flex-shrink-0">
            <div className="flex-1 min-w-0 h-9 rounded-[18px] bg-hx-input flex items-center px-3">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError("");
                }}
                placeholder={t("chat.placeholder")}
                aria-label={t("chat.messageLabel")}
                maxLength={2000}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-hx-text"
              />
              <EmojiPicker small label={t("chat.emoji")} onSelect={(emoji) => setText(insertAtCursor(inputRef.current, text, emoji, 2000))} />
            </div>
            <button
              type="submit"
              aria-label={t("chat.send")}
              disabled={!text.trim() || sending}
              className="h-9 w-9 flex items-center justify-center rounded-full text-hx-accent disabled:text-hx-text2 hover:bg-hx-hover transition-colors"
            >
              <Icon name="send" size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
