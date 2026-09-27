import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import SponsoredAds from "./SponsoredAds";
import { useLanguage } from "../context/LanguageContext";

const heading = "text-[17px] font-semibold text-hx-text2";
const divider = <div className="h-px bg-hx-border m-2" />;
const ACTIVE_ONLY_KEY = "hx-contacts-active-only";

const smallBtn = "w-8 h-8 rounded-full border-0 bg-transparent text-inherit flex items-center justify-center cursor-pointer hover:bg-hx-hover";

// Right column of the feed (shown at >= 900px): sponsored, pending friend
// requests (Confirm/Delete) and contacts with live presence (click to chat).
export default function RightSidebar() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openChat } = useChat();
  const { socket, isOnline } = useSocket();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeOnly, setActiveOnly] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_ONLY_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleActiveOnly = () => {
    const next = !activeOnly;
    setActiveOnly(next);
    setOptionsOpen(false);
    try {
      localStorage.setItem(ACTIVE_ONLY_KEY, next ? "1" : "0");
    } catch {
      // storage unavailable - the choice just won't persist
    }
  };

  const loadFriends = () =>
    api
      .get("/friends")
      .then(({ data }) => setFriends(data.friends))
      .catch(() => setFriends([]));
  const loadRequests = () =>
    api
      .get("/friends/requests")
      .then(({ data }) => setRequests(data.requests.filter((r) => r.from)))
      .catch(() => setRequests([]));

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  // New requests / accepted requests arrive as notifications.
  useEffect(() => {
    if (!socket) return;
    const onNotification = ({ notification }) => {
      if (notification.type === "friend_request") loadRequests();
      if (notification.type === "friend_accept") loadFriends();
    };
    socket.on("notification", onNotification);
    return () => socket.off("notification", onNotification);
  }, [socket]);

  const respond = async (requesterId, action) => {
    setRequests((prev) => prev.filter((r) => r.from._id !== requesterId));
    try {
      await api.post(`/friends/${action}/${requesterId}`);
      if (action === "accept") loadFriends();
    } catch {
      loadRequests();
    }
  };

  const needle = q.trim().toLowerCase();
  const contacts = friends
    .filter((f) => (!needle || f.name.toLowerCase().includes(needle)) && (!activeOnly || isOnline(f._id)))
    .sort((a, b) => Number(isOnline(b._id)) - Number(isOnline(a._id)));

  return (
    <aside className="hidden min-[900px]:block sticky top-14 w-[300px] flex-shrink-0 h-[calc(100vh-56px)] overflow-y-auto scrollbar-none pt-4 pb-4 pr-2">
      <div className={`${heading} px-2 pb-1`}>{t("sidebar.sponsored")}</div>
      <SponsoredAds />

      {requests.length > 0 && (
        <>
          {divider}
          <div className="flex items-center justify-between px-2 py-1">
            <div className={heading}>{t("sidebar.friendRequests")}</div>
            <span className="text-[13px] text-hx-text2">{requests.length}</span>
          </div>
          {requests.map(({ from }) => (
            <div key={from._id} className="flex gap-3 p-2 rounded-lg hover:bg-hx-hover animate-hx-fade">
              <div className="cursor-pointer" onClick={() => navigate(`/profile/${from._id}`)}>
                <Avatar src={from.avatar} name={from.name} size={56} />
              </div>
              <div className="flex-1 min-w-0">
                <div onClick={() => navigate(`/profile/${from._id}`)} className="font-semibold truncate cursor-pointer hover:underline">
                  {from.name}
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => respond(from._id, "accept")} className="hx-btn flex-1 bg-hx-accent text-white hover:brightness-95">
                    {t("common.confirm")}
                  </button>
                  <button onClick={() => respond(from._id, "reject")} className="hx-btn flex-1 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {divider}
      <div className="flex items-center justify-between py-1 pl-2">
        <div className={heading}>{t("sidebar.contacts")}</div>
        <div className="flex gap-1 text-hx-text2">
          <button
            onClick={() => {
              setSearching((s) => !s);
              setQ("");
            }}
            aria-label={searching ? t("sidebar.closeContactSearch") : t("sidebar.searchContacts")}
            className={smallBtn}
          >
            <Icon name={searching ? "x" : "search"} size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setOptionsOpen((o) => !o)}
              aria-label={t("sidebar.contactOptions")}
              aria-expanded={optionsOpen}
              className={smallBtn}
            >
              <Icon name="more" size={20} />
            </button>
            {optionsOpen && (
              <>
                <div className="fixed inset-0 z-[25]" onClick={() => setOptionsOpen(false)} />
                <div className="panel absolute right-0 top-9 w-64 p-2 z-[26] text-hx-text">
                  <button onClick={toggleActiveOnly} role="menuitemcheckbox" aria-checked={activeOnly} className="hx-row font-medium">
                    <Icon name={activeOnly ? "check" : "users"} size={20} />
                    <span className="flex-1 text-left">{t("sidebar.activeOnly")}</span>
                  </button>
                  <button
                    onClick={() => {
                      setOptionsOpen(false);
                      loadFriends();
                    }}
                    className="hx-row font-medium"
                  >
                    <Icon name="clock" size={20} />
                    <span className="flex-1 text-left">{t("sidebar.refreshContacts")}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {searching && (
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("sidebar.searchContacts")}
          aria-label={t("sidebar.searchContacts")}
          className="mx-2 mb-1 w-[calc(100%-16px)] h-9 rounded-[18px] bg-hx-input px-3 border-0 outline-none text-[15px] text-hx-text animate-hx-fade"
        />
      )}
      {contacts.map((f) => (
        <div key={f._id} onClick={() => openChat(f)} className="flex items-center gap-3 h-[52px] px-2 rounded-lg cursor-pointer hover:bg-hx-hover">
          <Avatar src={f.avatar} name={f.name} size={36} online={isOnline(f._id)} />
          <div className="flex-1 font-medium truncate">{f.name}</div>
        </div>
      ))}
      {contacts.length === 0 && (
        <p className="px-2 py-2 text-[13px] text-hx-text2">
          {needle
            ? t("sidebar.noContactsMatch", { q: q.trim() })
            : activeOnly && friends.length
              ? t("sidebar.noneActive")
              : t("sidebar.addFriendsHint")}
        </p>
      )}
    </aside>
  );
}
