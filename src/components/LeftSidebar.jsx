import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Avatar from "./Avatar";
import resolveImage from "../utils/resolveImage";
import { colorFor, initialsOf } from "../utils/format";
import Icon from "./Icon";

const LEFT = [
  { label: "nav.friends", icon: "users", color: "#1877f2", to: (u) => `/profile/${u._id}?tab=friends` },
  { label: "nav.memories", icon: "clock", color: "#0ea5a4", to: () => "/memories" },
  { label: "nav.saved", icon: "bookmark", color: "#8b5cf6", to: () => "/saved" },
  { label: "nav.groups", icon: "users", color: "#2563eb", to: () => "/groups" },
  { label: "nav.pages", icon: "flag", color: "#f97316", to: () => "/pages" },
  { label: "nav.marketplace", icon: "store", color: "#0891b2", to: () => "/marketplace" },
];

const LEFT_MORE = [
  { label: "nav.watch", icon: "watch", color: "#1877f2", to: () => "/watch" },
  { label: "nav.events", icon: "calendar", color: "#e0245e", to: () => "/events" },
];


const row = "flex items-center gap-3 h-[52px] px-2 rounded-lg cursor-pointer hover:bg-hx-hover";

// Left navigation column of the feed (shown at >= 1100px).
export default function LeftSidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState([]);

  // "Your shortcuts": the groups you're in, then pages you follow.
  useEffect(() => {
    Promise.all([api.get("/groups", { params: { mine: 1 } }), api.get("/pages", { params: { mine: 1 } })])
      .then(([g, p]) =>
        setShortcuts([
          ...g.data.groups.map((x) => ({ ...x, to: `/groups/${x._id}`, image: x.coverImage })),
          ...p.data.pages.map((x) => ({ ...x, to: `/pages/${x._id}`, image: x.avatar })),
        ])
      )
      .catch(() => setShortcuts([]));
  }, []);

  const items = [
    ...LEFT,
    ...(user?.role === "admin" ? [{ label: "nav.adminDashboard", icon: "shield", color: "#30a46c", to: () => "/admin" }] : []),
    ...(moreOpen ? LEFT_MORE : []),
  ];

  return (
    <aside className="hidden min-[1100px]:block sticky top-14 w-[300px] flex-shrink-0 h-[calc(100vh-56px)] overflow-y-auto scrollbar-none p-2 py-4">
      <div onClick={() => navigate(`/profile/${user?._id}`)} className={row}>
        <Avatar src={user?.avatar} name={user?.name} size={36} />
        <div className="font-medium truncate">{user?.name}</div>
      </div>

      {items.map((it) => (
        <div key={it.label} onClick={() => navigate(it.to(user))} className={`${row} animate-hx-fade`}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${it.color} 16%, transparent)`, color: it.color }}
          >
            <Icon name={it.icon} size={20} />
          </div>
          <div className="font-medium">{t(it.label)}</div>
        </div>
      ))}

      <div onClick={() => setMoreOpen((o) => !o)} className={row} aria-expanded={moreOpen}>
        <div
          className="w-9 h-9 rounded-full bg-hx-btn flex items-center justify-center transition-transform duration-[250ms]"
          style={{ transform: `rotate(${moreOpen ? 180 : 0}deg)` }}
        >
          <Icon name="chevDown" size={20} />
        </div>
        <div className="font-medium">{moreOpen ? t("nav.seeLess") : t("nav.seeMore")}</div>
      </div>

      <div className="h-px bg-hx-border m-2" />
      <div className="text-[17px] font-semibold text-hx-text2 px-2 pt-2 pb-1">{t("nav.yourShortcuts")}</div>
      {shortcuts.slice(0, 8).map((s) => (
        <div key={s._id} onClick={() => navigate(s.to)} className={row}>
          <div
            className="w-9 h-9 rounded-lg overflow-hidden text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0"
            style={{ background: colorFor(s.name) }}
          >
            {s.image ? <img src={resolveImage(s.image)} alt="" className="w-full h-full object-cover" /> : initialsOf(s.name)}
          </div>
          <div className="font-medium truncate">{s.name}</div>
        </div>
      ))}
      {shortcuts.length === 0 && (
        <div onClick={() => navigate("/groups")} className="px-2 py-2 text-[13px] text-hx-text2 cursor-pointer hover:underline">
          {t("nav.joinGroupsHint")}
        </div>
      )}

      <div className="text-[13px] text-hx-text2 px-2 py-4 leading-normal">
        {t("common.footerShort")}
      </div>
    </aside>
  );
}
