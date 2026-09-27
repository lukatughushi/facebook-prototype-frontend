import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { summarize, toggleInList } from "../utils/reactions";

// Reactions for a post whose state lives in a feed (see usePostFeed's
// updatePost): applied optimistically, then reconciled with the server.
export default function usePostActions(post, onUpdate) {
  const { user } = useAuth();
  const summary = summarize(post.reactions || [], user?._id);

  const react = async (type) => {
    const before = post.reactions || [];
    onUpdate({ reactions: toggleInList(before, user._id, type) });
    try {
      const { data } = await api.post(`/posts/${post._id}/react`, { type });
      onUpdate({ reactions: data.reactions });
    } catch {
      onUpdate({ reactions: before });
    }
  };

  const commentCount = (post.comments || []).reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  const shareCount = (post.shares || []).length;

  return { summary, react, commentCount, shareCount };
}
