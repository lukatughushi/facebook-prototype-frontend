import Icon from "../Icon";
import Emoji from "./Emoji";
import ReactionPicker from "./ReactionPicker";
import { REACTION } from "../../utils/reactions";
import { useLanguage } from "../../context/LanguageContext";

// The action-bar "Like" button: click toggles (Like, or removes your current
// reaction); hover/long-press opens the reaction bar. Shows your reaction's
// emoji and name in its color once you've reacted.
export default function ReactButton({ mine, onReact, className = "" }) {
  const r = mine ? REACTION[mine] : null;
  const { t } = useLanguage();
  return (
    <ReactionPicker onPick={onReact} className={`flex-1 ${className}`}>
      <button
        onClick={() => onReact(mine || "like")}
        aria-pressed={!!mine}
        className="w-full h-9 border-0 rounded bg-transparent flex items-center justify-center gap-2 cursor-pointer font-semibold text-[15px] transition-colors hover:bg-hx-hover active:scale-[.97]"
        style={{ color: r ? r.color : "rgb(var(--text2))" }}
      >
        {r ? (
          <span key={mine} className="animate-[reactPop_.3s_ease-out]">
            <Emoji type={mine} size={18} />
          </span>
        ) : (
          <Icon name="like" size={18} />
        )}
        <span>{r ? (mine === "like" ? t("post.like") : r.label) : t("post.like")}</span>
      </button>
    </ReactionPicker>
  );
}
