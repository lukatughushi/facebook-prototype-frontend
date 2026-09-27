import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../api/axios";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

// One shared WebSocket connection for the whole app (chat, notifications,
// presence). Connects once the user is authenticated, using the same JWT the
// REST client uses; disconnects on logout. `isOnline(id)` reflects the
// server's presence events and drives the green "online" dots.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(() => new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnline(new Set());
      return;
    }

    const token = localStorage.getItem("token");
    const socket = io(API_BASE, {
      auth: { token },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("presence:init", ({ online: ids }) => setOnline(new Set(ids)));
    socket.on("presence", ({ userId, online: isOn }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOn) next.add(userId);
        else next.delete(userId);
        return next;
      })
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const isOnline = useCallback((id) => online.has(id), [online]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, isOnline }}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
