import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import resolveImage from "../../utils/resolveImage";
import { formatDate } from "../../utils/format";
import { useLanguage } from "../../context/LanguageContext";
import Avatar from "../Avatar";
import Icon from "../Icon";

export const BIO_MAX = 101;

// Intro/About rows derived from the profile's fields.
export function profileDetails(profile, t) {
  return [
    { icon: "briefcase", pre: t("profile.details.worksAt"), val: profile.work },
    { icon: "school", pre: t("profile.details.studiedAt"), val: profile.education },
    { icon: "home", pre: t("profile.details.livesIn"), val: profile.city },
    { icon: "pin", pre: t("profile.details.from"), val: profile.hometown },
    {
      icon: "clock",
      pre: t("profile.details.joined"),
      val: profile.createdAt && formatDate(profile.createdAt, { month: "long", year: "numeric" }),
    },
  ].filter((d) => d.val);
}

const cardTitle = "text-xl font-bold";
const secondaryBtn = "hx-btn w-full bg-hx-btn text-hx-text hover:bg-hx-btnh";

export function IntroCard({ profile, isMe, onSaveBio, onEditDetails }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSaveBio(draft.trim());
      setEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("profile.bioFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 flex flex-col gap-3.5">
      <div className={cardTitle}>{t("profile.intro")}</div>
      {editing ? (
        <div className="flex flex-col gap-2 animate-hx-fade">
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX))}
            maxLength={BIO_MAX}
            placeholder={t("profile.bioPlaceholder")}
            className="w-full min-h-[90px] rounded-lg border border-hx-border bg-hx-input text-[15px] px-3 py-2.5 resize-none outline-none text-center focus:border-hx-accent"
          />
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="text-[13px] text-hx-text2">{t("profile.charsLeft", { count: BIO_MAX - draft.length })}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
                className="hx-btn bg-hx-btn text-hx-text hover:bg-hx-btnh"
              >
                {t("common.cancel")}
              </button>
              <button onClick={save} disabled={saving} className="hx-btn px-4 bg-hx-accent text-white hover:brightness-95">
                {t("common.saveShort")}
              </button>
            </div>
          </div>
          {error && <div className="text-[13px] text-red-500 text-center">{error}</div>}
        </div>
      ) : (
        <>
          {profile.bio && <div className="text-center break-words">{profile.bio}</div>}
          {isMe && (
            <button
              onClick={() => {
                setDraft((profile.bio || "").slice(0, BIO_MAX));
                setEditing(true);
              }}
              className={secondaryBtn}
            >
              {profile.bio ? t("profile.editBio") : t("profile.addBio")}
            </button>
          )}
        </>
      )}
      {profileDetails(profile, t).map(({ icon, pre, val }) => (
        <div key={pre} className="flex gap-3 items-center">
          <span className="text-hx-text2">
            <Icon name={icon} size={20} />
          </span>
          <div className="min-w-0 break-words">
            {pre} <b className="font-semibold">{val}</b>
          </div>
        </div>
      ))}
      {isMe && (
        <button onClick={onEditDetails} className={secondaryBtn}>
          {t("profile.editDetails")}
        </button>
      )}
    </div>
  );
}

function PhotoTile({ src, onOpen, rounded }) {
  const { t } = useLanguage();
  return (
    <div className={`relative aspect-square bg-hx-input overflow-hidden ${rounded ? "rounded-lg" : ""}`}>
      <button type="button" onClick={onOpen} className="block w-full h-full cursor-zoom-in" aria-label={t("profile.viewPhoto")}>
        <img src={resolveImage(src)} alt="" loading="lazy" className="w-full h-full object-cover transition hover:brightness-95" />
      </button>
      <span className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 text-white flex items-center justify-center pointer-events-none">
        <Icon name="expand" size={14} />
      </span>
    </div>
  );
}

export function PhotosCard({ photos, onOpen, onSeeAll }) {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <div className={cardTitle}>{t("profile.photos")}</div>
        {photos.length > 0 && (
          <button onClick={onSeeAll} className="text-[15px] text-hx-accent hover:underline">
            {t("profile.seeAllPhotos")}
          </button>
        )}
      </div>
      {photos.length === 0 ? (
        <p className="text-hx-text2 text-center py-4">{t("profile.noPhotosYet")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
          {photos.slice(0, 9).map((src, i) => (
            <PhotoTile key={`${i}-${src}`} src={src} onOpen={() => onOpen(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FriendTile({ friend }) {
  return (
    <Link to={`/profile/${friend._id}`} className="min-w-0 text-hx-text hover:no-underline">
      <Avatar
        src={friend.avatar}
        name={friend.name}
        size={120}
        rounded="8px"
        style={{ width: "100%", height: "auto", aspectRatio: "1 / 1", fontSize: 24 }}
        className="transition hover:brightness-110"
      />
      <div className="text-[13px] font-semibold mt-1 leading-tight break-words">{friend.name}</div>
    </Link>
  );
}

export function FriendsCard({ friends, mutualCount, isMe, onSeeAll }) {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className={cardTitle}>{t("profile.friends")}</div>
          <div className="text-[15px] text-hx-text2">
            {t("profile.friendsCount", { count: friends.length })}
            {!isMe && mutualCount > 0 && ` (${t("profile.mutualCount", { count: mutualCount })})`}
          </div>
        </div>
        {friends.length > 0 && (
          <button onClick={onSeeAll} className="text-[15px] text-hx-accent hover:underline">
            {t("profile.seeAllFriends")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-3">
        {friends.slice(0, 9).map((f) => (
          <FriendTile key={f._id} friend={f} />
        ))}
      </div>
    </div>
  );
}

export function AboutTab({ profile, isMe, onEditDetails }) {
  const { t } = useLanguage();
  const details = profileDetails(profile, t);
  return (
    <div className="card w-full p-5 animate-hx-fade">
      <div className="flex justify-between items-center mb-2">
        <div className={cardTitle}>{t("profile.about")}</div>
        {isMe && (
          <button onClick={onEditDetails} className="hx-btn bg-hx-btn text-hx-text hover:bg-hx-btnh">
            {t("profile.editDetails")}
          </button>
        )}
      </div>
      {details.map(({ icon, pre, val }) => (
        <div key={pre} className="flex items-center gap-3 py-2">
          <span className="h-9 w-9 rounded-full bg-hx-btn text-hx-text2 flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={20} />
          </span>
          <div className="flex-1 min-w-0 break-words">
            {pre} <b className="font-semibold">{val}</b>
          </div>
        </div>
      ))}
      {profile.bio && (
        <div className="border-t border-hx-border mt-3 pt-3">
          <div className="text-[17px] font-semibold mb-1">{t("profile.bio")}</div>
          <div className="text-hx-text2 break-words">{profile.bio}</div>
        </div>
      )}
    </div>
  );
}

// Friends tab. On your own profile it also lists pending requests
// (Confirm/Delete) and offers Message/Unfriend per friend.
export function FriendsTab({ friends, isMe, onMessage, onUnfriend, onRequestHandled }) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [requests, setRequests] = useState([]);
  const [menuFor, setMenuFor] = useState(null);

  useEffect(() => {
    if (!isMe) return;
    api
      .get("/friends/requests")
      .then(({ data }) => setRequests(data.requests.filter((r) => r.from)))
      .catch(() => setRequests([]));
  }, [isMe]);

  const respond = async (from, action) => {
    setRequests((prev) => prev.filter((r) => r.from._id !== from._id));
    try {
      await api.post(`/friends/${action}/${from._id}`);
      onRequestHandled?.(from, action);
    } catch {
      // request may already be handled elsewhere
    }
  };

  const needle = q.trim().toLowerCase();
  const list = needle ? friends.filter((f) => f.name.toLowerCase().includes(needle)) : friends;

  return (
    <div className="w-full flex flex-col gap-4 animate-hx-fade">
      {isMe && requests.length > 0 && (
        <div className="card p-5">
          <div className={`${cardTitle} mb-4`}>{t("sidebar.friendRequests")}</div>
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {requests.map(({ from }) => (
              <div key={from._id} className="flex items-center gap-4 p-4 border border-hx-border rounded-lg">
                <Link to={`/profile/${from._id}`}>
                  <Avatar src={from.avatar} name={from.name} size={80} rounded="8px" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${from._id}`} className="block font-semibold text-[17px] text-hx-text truncate">
                    {from.name}
                  </Link>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => respond(from, "accept")} className="hx-btn flex-1 bg-hx-accent text-white hover:brightness-95">
                      {t("common.confirm")}
                    </button>
                    <button onClick={() => respond(from, "reject")} className="hx-btn flex-1 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
          <div className={cardTitle}>{t("profile.friends")}</div>
          <div className="h-9 w-60 max-w-full rounded-[18px] bg-hx-input flex items-center gap-2 px-3 text-hx-text2">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search")}
              aria-label={t("profile.searchFriends")}
              className="flex-1 min-w-0 border-0 outline-none bg-transparent text-hx-text text-[15px]"
            />
          </div>
        </div>
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {list.map((f) => (
            <div key={f._id} className="flex items-center gap-4 p-4 border border-hx-border rounded-lg">
              <Link to={`/profile/${f._id}`}>
                <Avatar src={f.avatar} name={f.name} size={80} rounded="8px" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${f._id}`} className="block font-semibold text-[17px] text-hx-text break-words">
                  {f.name}
                </Link>
                {f.mutualCount > 0 && <div className="text-[13px] text-hx-text2">{t("profile.mutualFriends", { count: f.mutualCount })}</div>}
              </div>
              {isMe && (
                <div className="relative">
                  <button
                    onClick={() => setMenuFor((id) => (id === f._id ? null : f._id))}
                    aria-label={t("profile.optionsFor", { name: f.name })}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-hx-text2 hover:bg-hx-hover"
                  >
                    <Icon name="more" size={20} />
                  </button>
                  {menuFor === f._id && (
                    <>
                      <div className="fixed inset-0 z-[25]" onClick={() => setMenuFor(null)} />
                      <div className="panel absolute right-0 top-10 w-52 p-2 z-[26]">
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            onMessage(f);
                          }}
                          className="hx-row font-medium"
                        >
                          <Icon name="message" size={20} /> {t("profile.message")}
                        </button>
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            onUnfriend(f);
                          }}
                          className="hx-row font-medium"
                        >
                          <Icon name="userX" size={20} /> {t("friends.unfriend")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {list.length === 0 && (
          <div className="py-6 text-center text-hx-text2">
            {needle ? t("profile.noFriendsMatch", { q: q.trim() }) : t("profile.noFriends")}
          </div>
        )}
      </div>
    </div>
  );
}

export function PhotosTab({ photos, onOpen }) {
  const { t } = useLanguage();
  return (
    <div className="card w-full p-5 animate-hx-fade">
      <div className={`${cardTitle} mb-4`}>{t("profile.photos")}</div>
      {photos.length === 0 ? (
        <div className="py-10 text-center text-hx-text2">{t("profile.noPhotos")}</div>
      ) : (
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {photos.map((src, i) => (
            <PhotoTile key={`${i}-${src}`} src={src} rounded onOpen={() => onOpen(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Reels this person posted (GET /reels?author=); each opens in Watch.
export function VideosTab({ userId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [reels, setReels] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setReels(null);
    api
      .get("/reels", { params: { author: userId, limit: 30 } })
      .then(({ data }) => !cancelled && setReels(data.reels))
      .catch(() => !cancelled && setReels([]));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="card w-full p-5 animate-hx-fade">
      <div className={`${cardTitle} mb-4`}>{t("profile.videos")}</div>
      {reels === null ? (
        <div className="py-10 text-center text-hx-text2">{t("common.loading")}</div>
      ) : reels.length === 0 ? (
        <div className="py-10 text-center text-hx-text2">{t("profile.noVideos")}</div>
      ) : (
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
          {reels.map((r) => (
            <button
              key={r._id}
              onClick={() => navigate(`/watch?reel=${r._id}`)}
              aria-label={r.caption || t("reels.watchReel")}
              className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black group"
            >
              {r.posterUrl && (
                <img src={resolveImage(r.posterUrl)} alt="" loading="lazy" className="w-full h-full object-cover transition group-hover:brightness-90" />
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-11 h-11 rounded-full bg-black/55 text-white flex items-center justify-center">
                  <Icon name="play" size={20} fill="currentColor" sw={1} />
                </span>
              </span>
              <span className="absolute bottom-1.5 left-2 text-white text-xs font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
                {t("reels.views", { count: r.views || 0 })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The "More" sections have no data behind them yet.
export function EmptyTab({ title }) {
  const { t } = useLanguage();
  return (
    <div className="card w-full p-5 animate-hx-fade">
      <div className={cardTitle}>{title}</div>
      <div className="py-10 text-center text-hx-text2">{t("profile.nothingToShow")}</div>
    </div>
  );
}
