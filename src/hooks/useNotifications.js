import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext";

// Notification list + unread badge count, kept live via the "notification"
// socket event. The list itself is fetched lazily (when the panel opens).
// Until then the badge uses the server's count; once the list is loaded the
// badge is derived from it, so it can never disagree with what's shown.
export default function useNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [serverCount, setServerCount] = useState(0);

  const unreadCount = loaded ? notifications.filter((n) => !n.read).length : serverCount;

  useEffect(() => {
    api
      .get("/notifications/unread-count")
      .then(({ data }) => setServerCount(data.count))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setLoaded(true);
    } catch {
      // keep what we have
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNotification = ({ notification, unreadCount: count }) => {
      setNotifications((prev) => [notification, ...prev.filter((n) => n._id !== notification._id)]);
      setServerCount(count);
    };
    // A friend request was handled (here, in another tab, or from the
    // sidebar/profile): refresh the list so its card reflects that.
    const onSync = ({ unreadCount: count }) => {
      setServerCount(count);
      load();
    };
    socket.on("notification", onNotification);
    socket.on("notifications:sync", onSync);
    return () => {
      socket.off("notification", onNotification);
      socket.off("notifications:sync", onSync);
    };
  }, [socket, load]);

  // Latest list, for the callbacks below.
  const listRef = useRef(notifications);
  listRef.current = notifications;

  const markRead = useCallback((id) => {
    const target = listRef.current.find((n) => n._id === id);
    if (!target || target.read) return;
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    api.patch(`/notifications/${id}/read`).catch(() => {});
  }, []);

  // Marks everything read on the server and clears the badge. With `keepFresh`
  // (used when the panel opens) the just-read items stay highlighted while
  // the panel is open, so the user can still see what was new.
  const markAllRead = useCallback(async (keepFresh = false) => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, fresh: keepFresh === true && (!n.read || n.fresh) }))
    );
    setServerCount(0);
    api.patch("/notifications/read-all").catch(() => {});
  }, []);

  // Opening the panel: fetch the list, then mark it all read.
  const open = useCallback(async () => {
    await load();
    markAllRead(true);
  }, [load, markAllRead]);

  const remove = useCallback(async (id) => {
    const before = listRef.current;
    setNotifications(before.filter((n) => n._id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(before);
    }
  }, []);

  // Confirm/Delete on a friend_request notification. Confirm keeps the card
  // as "Request accepted"; Delete removes it. The backend updates the
  // notification to match.
  const respondToRequest = useCallback(
    async (id, action) => {
      const target = listRef.current.find((n) => n._id === id);
      if (!target?.sender?._id) return;
      setNotifications((prev) =>
        action === "accept"
          ? prev.map((n) => (n._id === id ? { ...n, read: true, status: "accepted" } : n))
          : prev.filter((n) => n._id !== id)
      );
      try {
        await api.post(`/friends/${action}/${target.sender._id}`);
      } catch {
        // Most likely already handled elsewhere; resync with the server.
        load();
      }
    },
    [load]
  );

  const clearAll = useCallback(async () => {
    const before = listRef.current;
    setNotifications([]);
    setServerCount(0);
    try {
      await api.delete("/notifications");
    } catch {
      setNotifications(before);
    }
  }, []);

  return { notifications, unreadCount, load, open, markRead, markAllRead, remove, respondToRequest, clearAll };
}
