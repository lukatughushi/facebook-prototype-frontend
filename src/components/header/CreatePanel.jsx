import { useNavigate } from "react-router-dom";
import Icon from "../Icon";
import { useLanguage } from "../../context/LanguageContext";

// "Create" menu. Each composer lives on its own page, so every item routes
// there with a hint in location state that the page picks up: the feed
// opens the post/story composer, Events and Groups open their create dialog.
export default function CreatePanel({ onClose }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const items = [
    { label: t("create.post"), sub: t("create.postSub"), icon: "pen", go: () => navigate("/", { state: { compose: "post" } }) },
    { label: t("create.story"), sub: t("create.storySub"), icon: "image", go: () => navigate("/", { state: { compose: "story" } }) },
    { label: t("create.event"), sub: t("create.eventSub"), icon: "calendar", go: () => navigate("/events", { state: { create: true } }) },
    { label: t("create.group"), sub: t("create.groupSub"), icon: "users", go: () => navigate("/groups", { state: { create: true } }) },
  ];

  return (
    <div className="panel absolute top-12 right-0 w-[min(360px,calc(100vw-16px))] px-2 py-3 z-40">
      <div className="text-2xl font-bold px-2 pb-2">{t("header.create")}</div>
      {items.map(({ label, sub, icon, go }) => (
        <div
          key={label}
          onClick={() => {
            onClose();
            go();
          }}
          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-hx-hover"
        >
          <div className="w-9 h-9 rounded-full bg-hx-btn text-hx-text flex items-center justify-center">
            <Icon name={icon} size={18} />
          </div>
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-[13px] text-hx-text2">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
