import { useEffect, useState } from "react";
import api from "../api/axios";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

const PRIMARY = "hx-btn bg-hx-accent text-white hover:brightness-95";
const SECONDARY = "hx-btn bg-hx-btn text-hx-text hover:bg-hx-btnh";

// The friendship action(s) for `userId` relative to the current user, backed
// by the /friends endpoints: Add friend / Cancel request / Confirm+Delete /
// Friends (menu with Unfriend). Reports status changes via onStatusChange.
export default function FriendButton({ userId, onStatusChange }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const applyStatus = (next) => {
    setStatus(next);
    onStatusChange?.(next);
  };

  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    api
      .get(`/friends/status/${userId}`)
      .then(({ data }) => !cancelled && applyStatus(data.status))
      .catch(() => !cancelled && applyStatus(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const run = (request, nextStatus) => async () => {
    if (busy) return;
    setBusy(true);
    setMenuOpen(false);
    try {
      await request();
      applyStatus(nextStatus);
    } catch {
      // keep the last known-good status
    } finally {
      setBusy(false);
    }
  };

  if (status === null || status === "self") return null;

  if (status === "none") {
    return (
      <button onClick={run(() => api.post(`/friends/request/${userId}`), "request_sent")} disabled={busy} className={PRIMARY}>
        <Icon name="userPlus" size={16} sw={2.4} /> <span>{t("friends.add")}</span>
      </button>
    );
  }

  if (status === "request_sent") {
    return (
      <button onClick={run(() => api.post(`/friends/cancel/${userId}`), "none")} disabled={busy} className={SECONDARY}>
        <Icon name="clock" size={16} sw={2.4} /> <span>{t("friends.cancelRequest")}</span>
      </button>
    );
  }

  if (status === "request_received") {
    return (
      <>
        <button onClick={run(() => api.post(`/friends/accept/${userId}`), "friends")} disabled={busy} className={PRIMARY}>
          <Icon name="check" size={16} sw={2.4} /> <span>{t("friends.confirmRequest")}</span>
        </button>
        <button onClick={run(() => api.post(`/friends/reject/${userId}`), "none")} disabled={busy} className={SECONDARY}>
          <Icon name="x" size={16} sw={2.4} /> <span>{t("friends.deleteRequest")}</span>
        </button>
      </>
    );
  }

  // status === "friends"
  return (
    <div className="relative">
      <button onClick={() => setMenuOpen((o) => !o)} disabled={busy} aria-expanded={menuOpen} className={SECONDARY}>
        <Icon name="userCheck" size={16} sw={2.4} /> <span>{t("nav.friends")}</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[25]" onClick={() => setMenuOpen(false)} />
          <div className="panel absolute top-11 left-0 z-[26] w-56 p-2 text-left">
            <button onClick={run(() => api.delete(`/friends/${userId}`), "none")} className="hx-row font-medium">
              <Icon name="userX" size={20} /> <span>{t("friends.unfriend")}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
