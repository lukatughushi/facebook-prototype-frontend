import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { topicLabel } from "../../utils/topics";
import api from "../../api/axios";
import Avatar from "../Avatar";
import Icon from "../Icon";

const RECENT_KEY = "hx-recent-searches";

// Results of every kind share one shape: { _id, kind, name, avatar, sub }.
const HREF = { person: (x) => `/profile/${x._id}`, group: (x) => `/groups/${x._id}`, page: (x) => `/pages/${x._id}` };

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

// People search in the header. On narrow screens (`compact`) it collapses to
// an icon button that expands into the input. Results come from
// GET /users?q=; picked people are remembered as "Recent searches".
export default function SearchBox({ compact, onFocusChange }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Built at render time so it follows the UI language (recent searches
  // saved by older versions only have a ready-made `sub`).
  const subtitle = (item) => {
    if (item.kind === "group" && item.memberCount != null) return `${t("search.group")} · ${t("groups.members", { count: item.memberCount })}`;
    if (item.kind === "page" && item.category) return `${t("pages.page")} · ${topicLabel(t, item.category)}`;
    if (item.kind === "group") return t("search.group");
    if (item.kind === "page") return t("pages.page");
    return t("search.person");
  };
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState(loadRecent);

  const query = q.trim();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      const params = { params: { q: query } };
      Promise.all([api.get("/users", params), api.get("/groups", params), api.get("/pages", params)])
        .then(([u, g, p]) => {
          if (cancelled) return;
          setResults([
            ...u.data.users.slice(0, 5).map((x) => ({ ...x, kind: "person" })),
            ...g.data.groups.slice(0, 3).map((x) => ({
              _id: x._id,
              kind: "group",
              name: x.name,
              avatar: x.coverImage,
              memberCount: x.memberCount,
            })),
            ...p.data.pages.slice(0, 3).map((x) => ({
              _id: x._id,
              kind: "page",
              name: x.name,
              avatar: x.avatar,
              category: x.category,
            })),
          ]);
        })
        .catch(() => !cancelled && setResults([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const setFocus = (value) => {
    setFocused(value);
    onFocusChange?.(value);
  };

  const pick = (item) => {
    const entry = { _id: item._id, kind: item.kind || "person", name: item.name, avatar: item.avatar, sub: item.sub };
    const next = [entry, ...recent.filter((r) => r._id !== item._id)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable - recent searches just won't persist
    }
    setQ("");
    setFocus(false);
    inputRef.current?.blur();
    navigate(HREF[entry.kind](entry));
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  };

  if (compact && !focused) {
    return (
      <button
        onClick={() => {
          setFocus(true);
          setTimeout(() => inputRef.current?.focus(), 20);
        }}
        aria-label={t("common.search")}
        className="h-10 w-10 rounded-full border-0 bg-hx-btn hover:bg-hx-btnh text-hx-text flex items-center justify-center"
      >
        <Icon name="search" size={16} />
      </button>
    );
  }

  const list = query ? results : recent;

  return (
    <>
      <div
        className="flex items-center gap-2 h-10 px-3 rounded-full bg-hx-input text-hx-text2 max-w-full transition-[width,box-shadow] duration-200"
        style={{
          width: focused ? (compact ? "min(280px, calc(100vw - 260px))" : "280px") : "240px",
          boxShadow: focused ? "0 0 0 2px var(--accent-soft)" : "none",
        }}
      >
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Escape") inputRef.current?.blur();
            if (e.key === "Enter" && results[0]) pick(results[0]);
          }}
          placeholder={t("header.search")}
          aria-label={t("header.search")}
          className="flex-1 min-w-0 border-0 outline-none bg-transparent text-hx-text text-[15px]"
        />
      </div>

      {focused && (
        <div className="panel absolute top-[50px] left-0 w-[min(340px,calc(100vw-16px))] p-2 z-40">
          <div className="flex justify-between items-center px-2 pt-1.5 pb-2">
            <div className="font-semibold text-[17px]">{query ? t("search.results") : t("search.recent")}</div>
            {!query && recent.length > 0 && (
              <button onMouseDown={(e) => e.preventDefault()} onClick={clearRecent} className="text-hx-accent text-[15px] hover:underline">
                {t("search.clear")}
              </button>
            )}
          </div>
          {list.map((item) => (
            <div
              key={item._id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              className="hx-row"
            >
              <Avatar src={item.avatar} name={item.name} size={36} rounded={item.kind === "group" ? "8px" : "50%"} />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-[13px] text-hx-text2">{subtitle(item)}</div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="px-2 py-4 text-center text-hx-text2">
              {query ? t("search.noResults", { q: query }) : t("search.hint")}
            </div>
          )}
        </div>
      )}
    </>
  );
}
