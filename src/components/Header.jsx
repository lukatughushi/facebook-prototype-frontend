import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useLanguage } from "../context/LanguageContext";
import useMediaQuery from "../hooks/useMediaQuery";
import useNotifications from "../hooks/useNotifications";
import Avatar from "./Avatar";
import Icon from "./Icon";
import SearchBox from "./header/SearchBox";
import CreatePanel from "./header/CreatePanel";
import MessagesPanel from "./header/MessagesPanel";
import NotificationsPanel from "./header/NotificationsPanel";
import AccountPanel from "./header/AccountPanel";

export const APP_NAME = "Hearth";

// Each tab is a route; the active one (and its sliding indicator) is derived
// from the URL, so deep links and back/forward stay in sync.
const TABS = [
  { label: "nav.home", icon: "home", to: "/", match: (p) => p === "/" },
  { label: "nav.watch", icon: "watch", to: "/watch", match: (p) => p.startsWith("/watch") },
  { label: "nav.marketplace", icon: "store", to: "/marketplace", match: (p) => p.startsWith("/marketplace") },
  { label: "nav.groups", icon: "users", to: "/groups", match: (p) => p.startsWith("/groups") },
];

function Badge({ count }) {
  if (!count) return null;
  return (
    <div className="absolute -top-[5px] -right-[5px] min-w-[19px] h-[19px] px-[5px] rounded-[10px] bg-[#e41e3f] text-white text-xs font-bold flex items-center justify-center pointer-events-none animate-hx-rise">
      {count > 99 ? "99+" : count}
    </div>
  );
}

function Tip({ label, show, align = "center" }) {
  if (!show) return null;
  return (
    <div
      className={`absolute top-12 ${align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"} bg-[rgba(28,30,33,0.9)] text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap pointer-events-none animate-hx-fade z-50`}
    >
      {label}
    </div>
  );
}

function NavTabs({ mobile, tab, visible, onSelect }) {
  const { t: tr } = useLanguage();
  const wide = useMediaQuery("(min-width: 1000px)");
  const tabW = mobile ? "25%" : `${wide ? 112 : 88}px`;

  const indicator = (
    <div
      className={`absolute bottom-0 left-0 h-[3px] bg-hx-accent ${mobile ? "" : "rounded-t-[3px]"}`}
      style={{
        width: tabW,
        transform: `translateX(${tab * 100}%)`,
        opacity: visible ? 1 : 0,
        transition: "transform .28s cubic-bezier(.3,.7,.3,1), opacity .2s",
      }}
    />
  );

  if (mobile) {
    return (
      <nav className="sticky top-14 z-[29] flex h-[52px] bg-hx-card border-t border-hx-border shadow-hx">
        {TABS.map((t, i) => {
          const on = visible && tab === i;
          return (
            <div
              key={t.label}
              onClick={() => onSelect(i)}
              title={tr(t.label)}
              aria-label={tr(t.label)}
              className="flex-1 flex items-center justify-center cursor-pointer"
              style={{ color: on ? "rgb(var(--accent))" : "rgb(var(--text2))" }}
            >
              <Icon name={t.icon} size={24} sw={on ? 2.3 : 2} />
            </div>
          );
        })}
        {indicator}
      </nav>
    );
  }

  return (
    <nav className="relative flex h-14">
      {TABS.map((t, i) => {
        const on = visible && tab === i;
        return (
          <div
            key={t.label}
            onClick={() => onSelect(i)}
            title={tr(t.label)}
            aria-label={tr(t.label)}
            className="h-14 flex items-center justify-center cursor-pointer transition-colors duration-200"
            style={{ width: tabW, color: on ? "rgb(var(--accent))" : "rgb(var(--text2))" }}
          >
            <div className="w-[calc(100%-8px)] h-12 rounded-lg flex items-center justify-center transition-colors hover:bg-hx-hover">
              <Icon name={t.icon} size={24} sw={on ? 2.3 : 2} />
            </div>
          </div>
        );
      })}
      {indicator}
    </nav>
  );
}

// Sticky top bar: logo + search | nav tabs | Create, Messages,
// Notifications and Account buttons with their dropdown panels.
export default function Header() {
  const { user } = useAuth();
  const { unreadTotal } = useChat();
  const { t } = useLanguage();
  const notif = useNotifications();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const [tip, setTip] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const showTabs = useMediaQuery("(min-width: 700px)");
  const compactSearch = useMediaQuery("(max-width: 1259px)");
  const matched = TABS.findIndex((t) => t.match(pathname));
  const onTab = matched !== -1;
  // Off-tab pages (profiles, pages...) park the hidden indicator on Home.
  const activeTab = onTab ? matched : 0;

  useEffect(() => setPanel(null), [pathname]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const selectTab = (i) => {
    setPanel(null);
    if (pathname !== TABS[i].to) navigate(TABS[i].to);
    window.scrollTo(0, 0);
  };

  const goHome = () => selectTab(0);

  const toggle = (name) => {
    setTip(null);
    setPanel((p) => (p === name ? null : name));
  };
  const close = () => setPanel(null);

  const buttons = [
    { key: "menu", label: t("header.create"), icon: "grid" },
    { key: "messages", label: t("header.messages"), icon: "message", badge: unreadTotal },
    { key: "notifications", label: t("header.notifications"), icon: "bell", badge: notif.unreadCount },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-hx-card shadow-hx grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 gap-2 transition-colors duration-200">
        <div className="relative flex items-center gap-2 min-w-0">
          {/* Classic Facebook "f" logo: the blue path has the "f" cut out, and
              the white circle underneath shows through it in both themes. */}
          <svg
            role="link"
            aria-label={APP_NAME}
            onClick={goHome}
            viewBox="0 0 24 24"
            className="w-10 h-10 flex-shrink-0 cursor-pointer select-none"
          >
            <title>{APP_NAME}</title>
            <circle cx="12" cy="12" r="11.4" fill="#fff" />
            <path
              fill="#1877F2"
              d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
            />
          </svg>
          <SearchBox compact={compactSearch} onFocusChange={setSearchFocused} />
        </div>

        {showTabs ? <NavTabs tab={activeTab} visible={onTab} onSelect={selectTab} /> : <div />}

        <div className="relative flex justify-end items-center gap-2">
          {buttons.map(({ key, label, icon, badge }) => {
            const active = panel === key;
            // Give a narrow screen's expanded search input room.
            if (searchFocused && compactSearch && !showTabs && key !== "notifications") return null;
            return (
              <div key={key} className="relative">
                <button
                  onClick={() => toggle(key)}
                  onMouseEnter={() => setTip(key)}
                  onMouseLeave={() => setTip(null)}
                  aria-label={label}
                  aria-expanded={active}
                  className="w-10 h-10 rounded-full border-0 flex items-center justify-center cursor-pointer transition-[background,transform] duration-150 active:scale-[.94]"
                  style={{
                    background: active ? "var(--accent-soft)" : "rgb(var(--btn))",
                    color: active ? "rgb(var(--accent))" : "rgb(var(--text))",
                  }}
                >
                  <Icon name={icon} size={20} />
                </button>
                <Badge count={badge} />
                <Tip label={label} show={tip === key && !panel} />
              </div>
            );
          })}

          <div className="relative">
            <button
              onClick={() => toggle("profile")}
              onMouseEnter={() => setTip("profile")}
              onMouseLeave={() => setTip(null)}
              aria-label={t("header.account")}
              aria-expanded={panel === "profile"}
              className="relative w-10 h-10 rounded-full border-0 p-0 cursor-pointer flex items-center justify-center active:scale-[.94]"
            >
              <Avatar src={user?.avatar} name={user?.name} size={40} />
              <span className="absolute -right-0.5 -bottom-0.5 w-4 h-4 rounded-full bg-hx-btn text-hx-text border-2 border-hx-card flex items-center justify-center">
                <Icon name="chevDown" size={10} sw={3} />
              </span>
            </button>
            <Tip label={t("header.account")} show={tip === "profile" && !panel} align="right" />
          </div>

          {panel && <div className="fixed inset-0 z-[35]" onClick={close} />}
          {panel === "menu" && <CreatePanel onClose={close} />}
          {panel === "messages" && <MessagesPanel onClose={close} />}
          {panel === "notifications" && <NotificationsPanel {...notif} onClose={close} />}
          {panel === "profile" && <AccountPanel onClose={close} />}
        </div>
      </header>

      {!showTabs && <NavTabs mobile tab={activeTab} visible={onTab} onSelect={selectTab} />}
    </>
  );
}
