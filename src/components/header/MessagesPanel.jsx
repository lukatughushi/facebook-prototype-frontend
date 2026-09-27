import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import { timeAgo } from "../../utils/format";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { useLanguage } from "../../context/LanguageContext";

// "Chats" panel: recent conversations (with unread markers) followed by
// friends you haven't messaged yet. Typing also searches everyone on the
// site, so you can start a chat with any user. Clicking a row opens a chat.
export default function MessagesPanel({ onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { conversations, openChat, refreshConversations } = useChat();
  const { isOnline } = useSocket();
  const [friends, setFriends] = useState([]);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState([]);

  useEffect(() => {
    refreshConversations();
    api
      .get("/friends")
      .then(({ data }) => setFriends(data.friends))
      .catch(() => setFriends([]));
  }, [refreshConversations]);

  // Everyone matching the search (debounced), not just friends/contacts.
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setPeople([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get("/users", { params: { q: query } })
        .then(({ data }) => !cancelled && setPeople(data.users))
        .catch(() => !cancelled && setPeople([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const rows = useMemo(() => {
    const seen = new Set(conversations.map((c) => c.user._id));
    const all = [
      ...conversations.map((c) => {
        const mine = c.lastMessage.sender === user._id;
        return { person: c.user, last: mine ? t("chat.youPrefix", { text: c.lastMessage.text }) : c.lastMessage.text, time: timeAgo(c.lastMessage.createdAt), unread: c.unreadCount > 0 };
      }),
      ...friends.filter((f) => !seen.has(f._id)).map((f) => ({ person: f, last: t("chat.startConversation"), time: "", unread: false })),
    ];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    const matches = all.filter((r) => r.person.name.toLowerCase().includes(needle));
    const shown = new Set(matches.map((r) => r.person._id));
    return [
      ...matches,
      ...people.filter((p) => !shown.has(p._id)).map((p) => ({ person: p, last: t("chat.startConversation"), time: "", unread: false })),
    ];
  }, [conversations, friends, people, q, user._id, t]);

  return (
    <div className="panel absolute top-12 right-0 w-[min(360px,calc(100vw-16px))] max-h-[calc(100vh-72px)] overflow-auto px-2 py-3 z-40">
      <div className="text-2xl font-bold px-2 pb-2.5">{t("chat.title")}</div>
      <div className="mx-2 mb-2 h-9 rounded-[18px] bg-hx-input flex items-center gap-2 px-3 text-hx-text2">
        <Icon name="search" size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("chat.search")}
          aria-label={t("chat.search")}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-hx-text text-[15px]"
        />
      </div>

      {rows.map(({ person, last, time, unread }) => (
        <button
          key={person._id}
          onClick={() => {
            openChat(person);
            onClose();
          }}
          className="hx-row"
        >
          <Avatar src={person.avatar} name={person.name} size={56} online={isOnline(person._id)} />
          <span className="flex-1 min-w-0">
            <span className="block font-medium truncate">{person.name}</span>
            <span className={`block text-[13px] truncate ${unread ? "text-hx-text font-semibold" : "text-hx-text2"}`}>
              {last}
              {time && ` · ${time}`}
            </span>
          </span>
          {unread && <span className="h-3 w-3 rounded-full bg-hx-accent flex-shrink-0" aria-label={t("notifications.unread")} />}
        </button>
      ))}

      {rows.length === 0 && (
        <p className="px-2 py-6 text-center text-hx-text2">
          {q.trim() ? t("chat.noMatch", { q: q.trim() }) : t("chat.addFriends")}
        </p>
      )}
    </div>
  );
}
