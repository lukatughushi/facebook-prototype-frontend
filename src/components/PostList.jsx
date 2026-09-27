import { useState } from "react";
import Loader from "./Loader";
import PostCard from "./PostCard";
import PhotoTheater from "./PhotoTheater";
import { useLanguage } from "../context/LanguageContext";

// Renders a usePostFeed() result: posts, empty state, the infinite scroll
// sentinel, and the photo viewer (paging through this feed's photos).
// With `acceptShares`, posts the user shares from here are added on top.
export default function PostList({ feed, hideGroup, acceptShares, empty }) {
  const { t } = useLanguage();
  const { posts, setPosts, updatePost, loading, loadingMore, hasMore, error, sentinelRef } = feed;
  const [photoId, setPhotoId] = useState(null);

  if (loading) return <Loader />;

  const onShared = ({ post }) => acceptShares && post && setPosts((prev) => [post, ...prev]);

  return (
    <>
      {posts.length === 0 && !error && <div className="card px-4 py-8 text-center text-hx-text2">{empty ?? t("feed.noPosts")}</div>}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          hideGroup={hideGroup}
          onUpdate={(patch) => updatePost(post._id, patch)}
          onOpenPhoto={(p) => setPhotoId(p._id)}
          onShared={onShared}
          onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
        />
      ))}
      {error && <div className="card px-4 py-3 text-center text-hx-text2">{error}</div>}
      {hasMore && <div ref={sentinelRef}>{loadingMore && <Loader small />}</div>}
      {!hasMore && posts.length > 3 && <div className="py-4 text-center text-[13px] text-hx-text2">{t("notifications.empty")}</div>}

      {photoId && (
        <PhotoTheater
          posts={posts.filter((p) => p.image)}
          startId={photoId}
          onClose={() => setPhotoId(null)}
          onUpdate={updatePost}
          onShared={onShared}
        />
      )}
    </>
  );
}
