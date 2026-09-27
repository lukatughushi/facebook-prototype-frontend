import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import Icon from "../components/Icon";
import PostList from "../components/PostList";
import usePostFeed from "../hooks/usePostFeed";
import { useLanguage } from "../context/LanguageContext";

const KINDS = {
  saved: {
    title: "nav.saved",
    icon: "bookmark",
    color: "#8b5cf6",
    blurb: "collections.savedBlurb",
    empty: "collections.savedEmpty",
    query: { saved: 1 },
  },
  memories: {
    title: "nav.memories",
    icon: "clock",
    color: "#0ea5a4",
    blurb: "collections.memoriesBlurb",
    empty: "collections.memoriesEmpty",
    query: { memories: 1 },
  },
};

// A titled post list backed by a GET /posts filter: Saved or Memories.
export function PostCollection({ kind }) {
  const cfg = KINDS[kind];
  const { t } = useLanguage();
  const feed = usePostFeed(cfg.query);

  return (
    <div className="min-h-screen bg-hx-bg">
      <Header />
      <div className="flex items-start">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4 px-2 min-[600px]:py-6 min-[600px]:px-8">
          <div className="max-w-[590px] mx-auto flex flex-col gap-4">
            <div className="card p-4 flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `color-mix(in oklab, ${cfg.color} 16%, transparent)`, color: cfg.color }}
              >
                <Icon name={cfg.icon} size={24} />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight">{t(cfg.title)}</h1>
                <p className="text-[15px] text-hx-text2">{t(cfg.blurb)}</p>
              </div>
            </div>
            <PostList feed={feed} empty={t(cfg.empty)} />
          </div>
        </main>
      </div>
    </div>
  );
}

export const SavedPage = () => <PostCollection kind="saved" />;
export const MemoriesPage = () => <PostCollection kind="memories" />;
