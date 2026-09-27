import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import LanguageToggle from "../LanguageToggle";
import Avatar from "../Avatar";
import Icon from "../Icon";

const row = "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-hx-hover";
const iconCircle = "w-9 h-9 rounded-full bg-hx-btn flex items-center justify-center";

// [keys, help.shortcuts.* key]
const SHORTCUTS = [
  ["Esc", "close"],
  ["← / →", "photos"],
  ["↑ / ↓ · J / K", "reels"],
  ["Space", "play"],
  ["M", "mute"],
  ["Enter", "send"],
];

const TIPS = ["save", "photos", "chat"]; // help.tips.<key>.title / .text

// "Help & support" sub-view of the account menu.
function HelpView({ onBack }) {
  const { t } = useLanguage();
  return (
    <div className="animate-hx-fade">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} aria-label={t("common.back")} className="hx-icon-btn">
          <Icon name="chevLeft" size={20} />
        </button>
        <div className="text-2xl font-bold">{t("account.help")}</div>
      </div>
      <div className="text-[17px] font-semibold px-2 mb-1">{t("help.shortcutsTitle")}</div>
      <dl className="px-2 mb-3">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys} className="flex justify-between gap-3 py-1.5 text-[15px]">
            <dt className="text-hx-text2">{t(`help.shortcuts.${what}`)}</dt>
            <dd>
              <kbd className="px-1.5 py-0.5 rounded bg-hx-btn text-[13px] font-semibold whitespace-nowrap">{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
      <div className="text-[17px] font-semibold px-2 mb-1">{t("help.tipsTitle")}</div>
      {TIPS.map((tip) => (
        <div key={tip} className="px-2 py-1.5">
          <div className="font-medium">{t(`help.tips.${tip}.title`)}</div>
          <div className="text-[13px] text-hx-text2">{t(`help.tips.${tip}.text`)}</div>
        </div>
      ))}
    </div>
  );
}

// Account menu: profile card, dark-mode switch, settings/help, log out
// (plus the admin dashboard for admins).
export default function AccountPanel({ onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dark = theme === "dark";
  const [view, setView] = useState("main"); // main | help

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const items = [
    ...(user?.role === "admin" ? [{ label: t("nav.adminDashboard"), icon: "shield", chev: true, run: () => go("/admin") }] : []),
    { label: t("account.settings"), icon: "settings", chev: true, run: () => go("/settings") },
    { label: t("account.help"), icon: "help", chev: true, run: () => setView("help") },
    {
      label: t("account.logout"),
      icon: "logout",
      run: async () => {
        onClose();
        await logout();
        navigate("/login");
      },
    },
  ];

  if (view === "help") {
    return (
      <div className="panel absolute top-12 right-0 w-[min(360px,calc(100vw-16px))] max-h-[calc(100vh-72px)] overflow-auto p-4 z-40">
        <HelpView onBack={() => setView("main")} />
      </div>
    );
  }

  return (
    <div className="panel absolute top-12 right-0 w-[min(360px,calc(100vw-16px))] p-4 z-40">
      <div className="rounded-lg shadow-[0_2px_12px_var(--shadow)] p-1 mb-3">
        <div onClick={() => go(`/profile/${user?._id}`)} className={row}>
          <Avatar src={user?.avatar} name={user?.name} size={36} />
          <div className="font-semibold text-[17px] truncate">{user?.name}</div>
        </div>
        <div className="h-px bg-hx-border mx-2 my-1" />
        <div
          onClick={() => go(`/profile/${user?._id}?tab=friends`)}
          className="p-2 font-semibold text-hx-accent text-[15px] rounded-lg cursor-pointer hover:bg-hx-hover"
        >
          {t("account.seeAllProfiles")}
        </div>
      </div>

      <div onClick={toggleTheme} role="switch" aria-checked={dark} className={row}>
        <div className={iconCircle}>
          <Icon name="moon" size={20} />
        </div>
        <div className="flex-1 font-medium">{t("account.darkMode")}</div>
        <div
          className="relative w-10 h-[22px] rounded-[11px] transition-colors duration-200"
          style={{ background: dark ? "rgb(var(--accent))" : "rgb(var(--btnh))" }}
        >
          <div
            className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-200"
            style={{ transform: `translateX(${dark ? 18 : 0}px)` }}
          />
        </div>
      </div>

      <div className={`${row} cursor-default hover:bg-transparent`}>
        <div className={iconCircle}>
          <Icon name="globe" size={20} />
        </div>
        <div className="flex-1 font-medium">{t("account.language")}</div>
        <LanguageToggle />
      </div>

      {items.map(({ label, icon, chev, run }) => (
        <div key={label} onClick={run} className={row}>
          <div className={iconCircle}>
            <Icon name={icon} size={20} />
          </div>
          <div className="flex-1 font-medium">{label}</div>
          {chev && (
            <span className="text-hx-text2">
              <Icon name="chevRight" size={20} />
            </span>
          )}
        </div>
      ))}

      <div className="text-[13px] text-hx-text2 px-2 pt-2">{t("common.footerShort")}</div>
    </div>
  );
}
