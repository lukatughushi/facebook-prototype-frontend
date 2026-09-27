import { REACTION } from "../../utils/reactions";
import Emoji from "./Emoji";

// Overlapping top-reaction emoji, optionally followed by a label.
export default function ReactionSummary({ summary, text, size = 18, className = "" }) {
  if (!summary.total) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <span className="flex flex-shrink-0">
        {summary.top.map((t, i) => (
          <span
            key={t}
            title={`${REACTION[t].label} · ${summary.counts[t]}`}
            className="rounded-full ring-2 ring-hx-card bg-hx-card animate-hx-rise"
            style={{ marginLeft: i ? -4 : 0, zIndex: 3 - i }}
          >
            <Emoji type={t} size={size} />
          </span>
        ))}
      </span>
      {text && <span className="truncate">{text}</span>}
    </span>
  );
}
