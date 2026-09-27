import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import StoriesBar from "../components/StoriesBar";
import StoryViewerModal from "../components/StoryViewerModal";
import CreateStoryModal from "../components/CreateStoryModal";
import CreatePost from "../components/CreatePost";
import PostList from "../components/PostList";
import usePostFeed from "../hooks/usePostFeed";
import api from "../api/axios";

const SEEN_KEY = "hx-seen-stories";

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []);
  } catch {
    return new Set();
  }
}

// Home feed: left nav (>=1100px) | stories + composer + posts | right rail (>=900px).
export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const feed = usePostFeed();
  const [stories, setStories] = useState([]);
  const [groupIndex, setGroupIndex] = useState(null);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [composeSignal, setComposeSignal] = useState(0);
  const [seen, setSeen] = useState(loadSeen);

  useEffect(() => {
    api
      .get("/stories")
      .then(({ data }) => setStories(data?.stories || []))
      .catch(() => setStories([]));
  }, []);

  // Header "Create" menu routes here with { compose: "post" | "story" }.
  useEffect(() => {
    const compose = location.state?.compose;
    if (!compose) return;
    if (compose === "story") setStoryComposerOpen(true);
    if (compose === "post") setComposeSignal((n) => n + 1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const handleCreated = (post) => feed.setPosts((prev) => [post, ...prev]);

  // Group flat stories by author, newest author activity first.
  const storyGroups = useMemo(() => {
    const map = new Map();
    for (const story of stories) {
      if (!story.author?._id) continue; // author account deleted
      const key = story.author._id;
      if (!map.has(key)) map.set(key, { author: story.author, stories: [] });
      map.get(key).stories.push(story);
    }
    const last = (g) => new Date(g.stories[g.stories.length - 1].createdAt);
    return Array.from(map.values()).sort((a, b) => last(b) - last(a));
  }, [stories]);

  const markSeen = (storyId) =>
    setSeen((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev).add(storyId);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-500)));
      } catch {
        // storage unavailable - rings just reset on reload
      }
      return next;
    });

  const handleStoryCreated = (story) => setStories((prev) => [...prev, story]);
  // The viewer passes the story to show next; with none left it closes.
  const handleStoryDeleted = (storyId, nextStoryId) => {
    setStories((prev) => prev.filter((s) => s._id !== storyId));
    if (!nextStoryId) setGroupIndex(null);
  };
  const handleAuthorMuted = (authorId, nextStoryId) => {
    setStories((prev) => prev.filter((s) => s.author?._id !== authorId));
    if (!nextStoryId) setGroupIndex(null);
  };

  return (
    <div className="min-h-screen bg-hx-bg">
      <Header />

      <div className="flex items-start justify-between">
        <LeftSidebar />

        <main className="flex-1 min-w-0 py-4 px-2 min-[600px]:py-6 min-[600px]:px-8">
          <div className="max-w-[590px] mx-auto flex flex-col gap-4">
            <StoriesBar
              groups={storyGroups}
              seen={seen}
              onCreateStory={() => setStoryComposerOpen(true)}
              onOpenGroup={(index) => setGroupIndex(index)}
            />
            <CreatePost openSignal={composeSignal} onCreated={handleCreated} />

            <PostList feed={feed} acceptShares />
          </div>
        </main>

        <RightSidebar />
      </div>

      {groupIndex !== null && (
        <StoryViewerModal
          groups={storyGroups}
          groupIndex={groupIndex}
          onNavigateGroup={setGroupIndex}
          onClose={() => setGroupIndex(null)}
          onDeleted={handleStoryDeleted}
          onMuted={handleAuthorMuted}
          onViewed={markSeen}
        />
      )}

      {storyComposerOpen && (
        <CreateStoryModal onClose={() => setStoryComposerOpen(false)} onCreated={handleStoryCreated} />
      )}
    </div>
  );
}
