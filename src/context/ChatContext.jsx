import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const ChatContext = createContext(null);

const MAX_OPEN_CHATS = 3;

// Owns the Messenger state shared by the header Messages panel, the Contacts
// sidebar, profile "Message" buttons and the floating chat dock:
// - which friends have an open chat window (auto-pops on incoming messages)
// - the conversation list with per-friend unread counts, kept live via socket
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [openChats, setOpenChats] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/messages/conversations");
      setConversations(data.conversations);
      setUnreadTotal(data.unreadTotal);
    } catch {
      // keep the last known list
    }
  }, []);

  // `friend` may carry `item` (a Marketplace listing) when opened via
  // "Message seller"; re-opening an open chat just refreshes that context.
  const openChat = useCallback((friend) => {
    setOpenChats((prev) => {
      if (prev.some((f) => f._id === friend._id)) {
        return friend.item ? prev.map((f) => (f._id === friend._id ? { ...f, item: friend.item } : f)) : prev;
      }
      return [friend, ...prev].slice(0, MAX_OPEN_CHATS);
    });
  }, []);

  const closeChat = useCallback((friendId) => {
    setOpenChats((prev) => prev.filter((f) => f._id !== friendId));
  }, []);

  useEffect(() => {
    if (!user) {
      setOpenChats([]);
      setConversations([]);
      setUnreadTotal(0);
      return;
    }
    refreshConversations();
  }, [user?._id, refreshConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !user) return;
    const onNewMessage = ({ message }) => {
      if (message.sender?._id !== user._id) openChat(message.sender);
      refreshConversations();
    };
    socket.on("newMessage", onNewMessage);
    socket.on("messagesRead", refreshConversations);
    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("messagesRead", refreshConversations);
    };
  }, [socket, user, openChat, refreshConversations]);

  return (
    <ChatContext.Provider value={{ openChats, openChat, closeChat, conversations, unreadTotal, refreshConversations }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
