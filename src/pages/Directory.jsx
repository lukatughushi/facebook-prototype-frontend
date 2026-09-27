import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Icon from "../components/Icon";
import EntityCard from "../components/entity/EntityCard";
import CreateGroupModal from "../components/CreateGroupModal";
import { topicLabel } from "../utils/topics";
import { useLanguage } from "../context/LanguageContext";

const KINDS = {
  groups: {
    title: "nav.groups",
    endpoint: "/groups",
    listKey: "groups",
    mineKey: "isMember",
    mineTitle: "groups.yours",
    discoverTitle: "groups.discover",
    searchLabel: "groups.search",
    to: (g) => `/groups/${g._id}`,
    meta: (g, t) => (
      <>
        <Icon name={g.privacy === "private" ? "lock" : "globe"} size={12} />
        {g.privacy === "private" ? t("groups.private") : t("groups.public")} · {t("groups.members", { count: g.memberCount })}
      </>
    ),
    toggle: (g) => api.post(`/groups/${g._id}/${g.isMember ? "leave" : "join"}`).then(({ data }) => data.group),
    labels: ["groups.join", "groups.joined"],
    canCreate: true,
  },
  pages: {
    title: "nav.pages",
    endpoint: "/pages",
    listKey: "pages",
    mineKey: "isFollowing",
    mineTitle: "pages.yours",
    discoverTitle: "pages.discover",
    searchLabel: "pages.search",
    withAvatar: true,
    to: (p) => `/pages/${p._id}`,
    meta: (p, t) => (
      <>
        {topicLabel(t, p.category)} · {t("pages.followers", { count: p.followerCount })}
      </>
    ),
    toggle: (p) => api.post(`/pages/${p._id}/follow`).then(({ data }) => data.page),
    labels: ["pages.follow", "pages.following"],
  },
};

// Browse screen for groups or pages: search, category chips, "yours" first,
// then everything else, each card with a Join/Follow toggle. Groups can also
// be created here (header Create > Group arrives with state { create: true }).
export function Directory({ kind }) {
  const cfg = KINDS[kind];
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!cfg.canCreate || !location.state?.create) return;
    setCreating(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [cfg.canCreate, location.state, location.pathname, navigate]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(cfg.endpoint)
      .then(({ data }) => setItems(data[cfg.listKey]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cfg]);

  const categories = useMemo(() => ["All", ...new Set(items.map((x) => x.category))], [items]);
  const needle = q.trim().toLowerCase();
  const visible = items.filter(
    (x) => (category === "All" || x.category === category) && (!needle || x.name.toLowerCase().includes(needle))
  );
  const mine = visible.filter((x) => x[cfg.mineKey]);
  const rest = visible.filter((x) => !x[cfg.mineKey]);

  const toggle = async (item) => {
    setBusy(item._id);
    try {
      const updated = await cfg.toggle(item);
      setItems((prev) => prev.map((x) => (x._id === item._id ? { ...x, ...updated } : x)));
    } catch {
      // leave the card unchanged; the button re-enables for a retry
    } finally {
      setBusy(null);
    }
  };

  const grid = (list) => (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
      {list.map((x) => (
        <EntityCard
          key={x._id}
          to={cfg.to(x)}
          name={x.name}
          coverImage={x.coverImage}
          avatar={cfg.withAvatar ? x.avatar : undefined}
          meta={cfg.meta(x, t)}
          action={
            <button
              onClick={() => toggle(x)}
              disabled={busy === x._id}
              className={`hx-btn w-full ${x[cfg.mineKey] ? "bg-hx-btn text-hx-text hover:bg-hx-btnh" : "bg-hx-accent-soft text-hx-accent hover:brightness-95"}`}
            >
              {x[cfg.mineKey] && <Icon name="check" size={16} sw={2.4} />}
              {t(cfg.labels[x[cfg.mineKey] ? 1 : 0])}
            </button>
          }
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1100px] mx-auto py-6 px-2 min-[600px]:px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{t(cfg.title)}</h1>
          <div className="flex items-center gap-2 flex-wrap">
          {cfg.canCreate && (
            <button onClick={() => setCreating(true)} className="hx-btn bg-hx-accent text-white hover:brightness-95">
              <Icon name="plus" size={16} sw={2.4} /> {t("groups.create")}
            </button>
          )}
          <div className="h-10 w-[280px] max-w-full rounded-[20px] bg-hx-card shadow-hx flex items-center gap-2 px-3 text-hx-text2">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(cfg.searchLabel)}
              aria-label={t(cfg.searchLabel)}
              className="flex-1 min-w-0 border-0 outline-none bg-transparent text-hx-text text-[15px]"
            />
          </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="h-9 px-3 rounded-[18px] border-0 font-semibold text-[15px] whitespace-nowrap cursor-pointer transition-colors"
              style={{
                background: category === c ? "var(--accent-soft)" : "rgb(var(--card))",
                color: category === c ? "rgb(var(--accent))" : "rgb(var(--text))",
              }}
            >
              {c === "All" ? t("common.all") : topicLabel(t, c)}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            {mine.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xl font-bold">{t(cfg.mineTitle)}</h2>
                {grid(mine)}
              </section>
            )}
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold">{t(cfg.discoverTitle)}</h2>
              {rest.length ? grid(rest) : <div className="card p-8 text-center text-hx-text2">{t("common.nothingToShow")}</div>}
            </section>
          </>
        )}
      </main>

      {creating && (
        <CreateGroupModal
          onClose={() => setCreating(false)}
          onCreated={(group) => {
            setCreating(false);
            navigate(`/groups/${group._id}`);
          }}
        />
      )}
    </div>
  );
}

export const GroupsDirectory = () => <Directory kind="groups" />;
export const PagesDirectory = () => <Directory kind="pages" />;
