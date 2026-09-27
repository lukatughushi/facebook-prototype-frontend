import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import ChatWindow from "./ChatWindow";

// Every currently open chat window, docked along the bottom-right edge of
// the viewport. Mounted once, globally, in App.jsx.
export default function ChatDock() {
  const { user } = useAuth();
  const { openChats, closeChat } = useChat();

  if (!user || openChats.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-2 sm:right-4 z-50 flex flex-row-reverse items-end gap-2 pointer-events-none">
      {openChats.map((friend, i) => (
        // On narrow screens only the most recent window fits.
        <div key={friend._id} className={`pointer-events-auto ${i > 0 ? "hidden md:block" : ""}`}>
          <ChatWindow friend={friend} onClose={() => closeChat(friend._id)} />
        </div>
      ))}
    </div>
  );
}
