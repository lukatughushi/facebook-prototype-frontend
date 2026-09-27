import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";

// Cursor-paginated posts from GET /posts, filtered by `query` (author, group
// or page id; empty = home feed). Attach `sentinelRef` to an element below
// the list and the next page loads as it scrolls into view.
export default function usePostFeed(query = {}, { enabled = true, limit = 10 } = {}) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const generation = useRef(0);
  const observer = useRef(null);
  const key = JSON.stringify(query);

  const fetchPage = useCallback(
    async (before) => {
      const gen = generation.current;
      const { data } = await api.get("/posts", { params: { ...JSON.parse(key), limit, ...(before ? { before } : {}) } });
      return gen === generation.current ? data : null; // drop stale responses
    },
    [key, limit]
  );

  useEffect(() => {
    generation.current += 1;
    setPosts([]);
    setCursor(null);
    setError("");
    if (!enabled) return;
    setLoading(true);
    busy.current = true;
    fetchPage(null)
      .then((data) => {
        if (!data) return;
        setPosts(data.posts);
        setCursor(data.nextCursor);
      })
      .catch(() => setError("feed.loadFailed"))
      .finally(() => {
        busy.current = false;
        setLoading(false);
      });
  }, [fetchPage, enabled]);

  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor);
      if (!data) return;
      setPosts((prev) => [...prev, ...data.posts.filter((p) => !prev.some((q) => q._id === p._id))]);
      setCursor(data.nextCursor);
    } catch {
      setError("feed.loadMoreFailed");
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [cursor, fetchPage]);

  // Callback ref: (re)observes whichever sentinel element is mounted.
  const sentinelRef = useCallback(
    (el) => {
      observer.current?.disconnect();
      if (!el) return;
      observer.current = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
        rootMargin: "600px 0px",
      });
      observer.current.observe(el);
    },
    [loadMore]
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  // Single source of truth for a post's reactions/comments/shares, so a card
  // and the photo viewer showing the same post stay in sync.
  const updatePost = useCallback(
    (id, patch) => setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p))),
    []
  );

  // `error` is stored as a translation key and translated on the way out.
  return { posts, setPosts, updatePost, loading, loadingMore, hasMore: !!cursor, error: error ? t(error) : "", loadMore, sentinelRef };
}
