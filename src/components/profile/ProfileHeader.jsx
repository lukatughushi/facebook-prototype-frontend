import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FriendButton from "../FriendButton";
import CoverRepositioner from "./CoverRepositioner";
import Avatar from "../Avatar";
import Icon from "../Icon";
import resolveImage from "../../utils/resolveImage";
import { colorFor } from "../../utils/format";
import { useLanguage } from "../../context/LanguageContext";
import { useReport } from "../../context/ReportContext";

export const PROFILE_TABS = ["Posts", "About", "Friends", "Photos", "Videos", "More"];
export const MORE_ITEMS = ["Check-ins", "Sports", "Music", "Movies", "Books", "Likes", "Events"];

// Valid ?tab= values: the lowercase tab names (minus "more") or "more:<item>".
export const isValidTab = (t) =>
  !!t && (PROFILE_TABS.slice(0, 5).some((l) => l.toLowerCase() === t) || MORE_ITEMS.some((m) => t === `more:${m}`));

// Display names for the tabs / "More" items (the values above stay English,
// they're part of the ?tab= URL).
export const tabLabel = (t, label) => t(`profile.${label.toLowerCase()}`);
export const moreItemLabel = (t, item) => t(`profile.moreItems.${item.toLowerCase().replace(/[^a-z]/g, "")}`);

// Cover photo, avatar, name/friend summary, action buttons and the tab bar.
export default function ProfileHeader({
  profile,
  isMe,
  friends,
  mutualCount,
  friendStatus,
  onFriendStatusChange,
  tab,
  onTabChange,
  uploading,
  onPickCover,
  onPickAvatar,
  coverEdit,
  coverSaving,
  onRepositionCover,
  onCoverPositionChange,
  onCoverSave,
  onCoverCancel,
  onViewCover,
  onViewAvatar,
  onEditProfile,
  onAddStory,
  onMessage,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const report = useReport();
  const [profMenu, setProfMenu] = useState(false);
  const [coverMenu, setCoverMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [moreX, setMoreX] = useState(16);

  const friendsText = isMe
    ? t("profile.friendsCount", { count: friends.length })
    : `${t("profile.friendsCount", { count: friends.length })}${mutualCount ? ` · ${t("profile.mutualCount", { count: mutualCount })}` : ""}`;

  const menu = isMe
    ? [
        { icon: "eye", label: t("profile.menu.viewAs"), off: true },
        { icon: "search", label: t("profile.menu.search"), off: true },
        { icon: "bookmark", label: t("profile.menu.savedItems"), run: () => navigate("/saved") },
        { icon: "archive", label: t("nav.memories"), run: () => navigate("/memories") },
        { icon: "list", label: t("profile.menu.activityLog"), off: true },
        { icon: "settings", label: t("profile.menu.profileSettings"), run: onEditProfile },
        { icon: "lock", label: t("profile.menu.lockProfile"), off: true },
      ]
    : [
        { icon: "search", label: t("profile.menu.search"), off: true },
        { icon: "users", label: t("profile.menu.seeFriendship"), run: () => onTabChange("friends") },
        { icon: "flag", label: t("report.reportProfile"), run: () => report({ contentType: "profile", targetId: profile._id }) },
        { icon: "lock", label: t("profile.menu.block"), off: true },
      ];

  const selectTab = (label, e) => {
    const k = label.toLowerCase();
    if (k !== "more") {
      setMoreMenu(false);
      onTabChange(k);
      return;
    }
    const el = e.currentTarget;
    const par = el.parentNode;
    setMoreX(Math.max(8, Math.min(el.offsetLeft - par.scrollLeft, par.clientWidth - 248)));
    setMoreMenu((o) => !o);
  };

  const actionBtn = (primary) =>
    `hx-btn ${primary ? "bg-hx-accent text-white" : "bg-hx-btn text-hx-text"} hover:brightness-[0.94]`;

  return (
    <div className="bg-hx-card shadow-hx animate-[hxFade_.25s_ease]">
      <div className="max-w-[1100px] mx-auto">
        {/* Cover */}
        <div
          className="relative h-[max(180px,36vw)] min-[1100px]:h-[400px] rounded-b-lg overflow-hidden bg-hx-input"
          style={profile.coverImage ? undefined : { background: `linear-gradient(135deg, ${colorFor(profile.name)}, rgb(var(--input)))` }}
        >
          {coverEdit ? (
            <CoverRepositioner src={coverEdit.url} position={coverEdit.position} onChange={onCoverPositionChange} />
          ) : (
            profile.coverImage && (
              <img
                src={resolveImage(profile.coverImage)}
                alt={t("profile.coverAlt", { name: profile.name })}
                onClick={onViewCover}
                className="w-full h-full object-cover cursor-zoom-in"
                style={{ objectPosition: `50% ${profile.coverPosition ?? 50}%` }}
              />
            )
          )}
          {(uploading === "cover" || coverSaving) && <UploadingOverlay />}
          {isMe && coverEdit && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-md bg-black/55 text-white text-[13px] font-semibold">{t("cover.editing")}</span>
              <div className="flex gap-2">
                <button
                  onClick={onCoverCancel}
                  disabled={coverSaving}
                  className="hx-btn bg-black/55 hover:bg-black/70 text-white"
                >
                  {t("common.cancel")}
                </button>
                <button onClick={onCoverSave} disabled={coverSaving} className="hx-btn px-4 bg-hx-accent text-white hover:brightness-95">
                  {coverSaving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </div>
          )}
          {isMe && !coverEdit && (
            <div className="absolute right-4 bottom-4">
              <button
                onClick={() => setCoverMenu((o) => !o)}
                disabled={!!uploading}
                aria-expanded={coverMenu}
                className="h-9 px-3 border-0 rounded-md bg-white hover:bg-[#f2f2f2] text-[#050505] font-semibold text-[15px] flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-colors disabled:opacity-70"
              >
                <Icon name="camera" size={16} />
                <span className="hidden min-[600px]:inline">{t("profile.editCover")}</span>
              </button>
              {coverMenu && (
                <>
                  <div className="fixed inset-0 z-[25]" onClick={() => setCoverMenu(false)} />
                  <div role="menu" className="panel absolute right-0 bottom-11 w-56 p-2 z-[26] text-left">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setCoverMenu(false);
                        onPickCover();
                      }}
                      className="hx-row font-medium"
                    >
                      <Icon name="image" size={20} /> <span>{t("cover.upload")}</span>
                    </button>
                    {profile.coverImage && (
                      <button
                        role="menuitem"
                        onClick={() => {
                          setCoverMenu(false);
                          onRepositionCover();
                        }}
                        className="hx-row font-medium"
                      >
                        <Icon name="expand" size={20} /> <span>{t("cover.reposition")}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Avatar + name + actions */}
        <div className="flex flex-col items-center text-center min-[900px]:flex-row min-[900px]:items-end min-[900px]:text-left gap-4 px-8 pb-4">
          <div className="relative flex-shrink-0 w-[140px] h-[140px] -mt-[70px] min-[600px]:w-[168px] min-[600px]:h-[168px] min-[600px]:-mt-[84px]">
            <div
              onClick={profile.avatar ? onViewAvatar : undefined}
              className={`relative w-full h-full rounded-full border-4 border-hx-card overflow-hidden ${profile.avatar ? "cursor-zoom-in" : ""}`}
              style={{ background: colorFor(profile.name) }}
            >
              <Avatar src={profile.avatar} name={profile.name} size={168} style={{ width: "100%", height: "100%", fontSize: 56 }} />
              {uploading === "avatar" && <UploadingOverlay />}
            </div>
            {isMe && (
              <button
                onClick={onPickAvatar}
                disabled={!!uploading}
                aria-label={t("profile.updatePicture")}
                className="absolute right-1.5 bottom-2.5 w-9 h-9 rounded-full border-0 bg-hx-btn hover:bg-hx-btnh text-hx-text flex items-center justify-center cursor-pointer transition-colors"
              >
                <Icon name="camera" size={16} />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="text-[32px] font-bold leading-[1.2] break-words">{profile.name}</div>
            <div className="text-[15px] font-semibold text-hx-text2 mt-1">{friendsText}</div>
            <div className="flex justify-center min-[900px]:justify-start pl-1.5 mt-2">
              {friends.slice(0, 8).map((f) => (
                <div
                  key={f._id}
                  onClick={() => navigate(`/profile/${f._id}`)}
                  title={f.name}
                  className="-ml-1.5 rounded-full border-2 border-hx-card cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <Avatar src={f.avatar} name={f.name} size={28} style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex gap-2 flex-wrap justify-center pb-2">
            {isMe ? (
              <>
                <button onClick={onAddStory} className={actionBtn(true)}>
                  <Icon name="plus" size={16} sw={2.4} />
                  <span>{t("profile.addToStory")}</span>
                </button>
                <button onClick={onEditProfile} className={actionBtn(false)}>
                  <Icon name="pen" size={16} sw={2.4} />
                  <span>{t("profile.editProfile")}</span>
                </button>
              </>
            ) : (
              <>
                <FriendButton userId={profile._id} onStatusChange={onFriendStatusChange} />
                {friendStatus === "friends" && (
                  <button onClick={onMessage} className={actionBtn(true)}>
                    <Icon name="message" size={16} sw={2.4} />
                    <span>{t("profile.message")}</span>
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setProfMenu((o) => !o)}
              aria-label={t("profile.moreOptions")}
              aria-expanded={profMenu}
              className="w-12 h-9 border-0 rounded-md text-hx-text flex items-center justify-center cursor-pointer transition hover:brightness-[0.94]"
              style={{ background: profMenu ? "var(--accent-soft)" : "rgb(var(--btn))" }}
            >
              <Icon name="chevDown" size={20} />
            </button>
            {profMenu && (
              <>
                <div className="fixed inset-0 z-[25]" onClick={() => setProfMenu(false)} />
                <div className="panel absolute top-11 right-0 w-[300px] max-w-[calc(100vw-16px)] p-2 z-[26] text-left">
                  {menu.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      disabled={m.off}
                      title={m.off ? t("common.unavailable") : undefined}
                      onClick={() => {
                        setProfMenu(false);
                        m.run?.();
                      }}
                      className="flex items-center gap-3 w-full p-2 rounded-md font-medium text-left enabled:hover:bg-hx-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon name={m.icon} size={20} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mx-8 h-px bg-hx-border" />
        <div className="relative">
          <div className="flex px-4 overflow-x-auto scrollbar-none" role="tablist">
            {PROFILE_TABS.map((label) => {
              const k = label.toLowerCase();
              const active = k === "more" ? tab.startsWith("more:") : tab === k;
              return (
                <div
                  key={label}
                  role="tab"
                  aria-selected={active}
                  onClick={(e) => selectTab(label, e)}
                  className="relative h-[60px] flex-shrink-0 flex items-center cursor-pointer"
                >
                  <div
                    className="h-12 px-4 rounded-md flex items-center gap-1 font-semibold text-[15px] transition-colors hover:bg-hx-hover"
                    style={{ color: active ? "rgb(var(--accent))" : "rgb(var(--text2))" }}
                  >
                    <span>{k === "more" && active ? moreItemLabel(t, tab.slice(5)) : tabLabel(t, label)}</span>
                    {k === "more" && <Icon name="chevDown" size={10} sw={3} />}
                  </div>
                  <div
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-[3px] bg-hx-accent transition-transform duration-[250ms]"
                    style={{ transform: `scaleX(${active ? 1 : 0})` }}
                  />
                </div>
              );
            })}
          </div>
          {moreMenu && (
            <>
              <div className="fixed inset-0 z-[25]" onClick={() => setMoreMenu(false)} />
              <div className="panel absolute top-14 w-60 p-2 z-[26]" style={{ left: moreX }}>
                {MORE_ITEMS.map((m) => (
                  <div
                    key={m}
                    onClick={() => {
                      setMoreMenu(false);
                      onTabChange(`more:${m}`);
                    }}
                    className="py-2.5 px-2 rounded-md cursor-pointer font-medium hover:bg-hx-hover"
                    style={{ color: tab === `more:${m}` ? "rgb(var(--accent))" : "rgb(var(--text))" }}
                  >
                    {moreItemLabel(t, m)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadingOverlay() {
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
    </div>
  );
}
