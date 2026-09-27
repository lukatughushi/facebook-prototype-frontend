import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import resolveImage from "../utils/resolveImage";
import { colorFor, formatDate, formatDateTime } from "../utils/format";
import { useLanguage } from "../context/LanguageContext";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const field =
  "w-full h-11 rounded-md border border-hx-border bg-hx-card text-hx-text text-[15px] px-3 outline-none focus:border-hx-accent focus:shadow-[0_0_0_2px_var(--accent-soft)]";

// Value for <input type="datetime-local"> (local time, minute precision).
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function EventCard({ event, busy, onToggleGoing, onDelete }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const start = new Date(event.startsAt);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="card overflow-hidden flex flex-col animate-hx-fade">
      <div
        className="relative h-[130px] bg-hx-input"
        style={event.coverImage ? undefined : { background: `linear-gradient(135deg, ${colorFor(event.title)}, rgb(var(--input)))` }}
      >
        {event.coverImage && <img src={resolveImage(event.coverImage)} alt="" loading="lazy" className="w-full h-full object-cover" />}
        <div className="absolute top-2 left-2 w-12 rounded-lg bg-hx-card text-center shadow-hx overflow-hidden">
          <div className="text-[11px] font-bold uppercase bg-[#e41e3f] text-white leading-5">
            {formatDate(start, { month: "short" })}
          </div>
          <div className="text-xl font-bold leading-7">{start.getDate()}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1 p-3">
        <div className="text-[13px] font-semibold text-[#e41e3f] uppercase">
          {formatDateTime(start, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="font-semibold text-[17px] leading-tight break-words">{event.title}</div>
        {event.location && (
          <div className="text-[13px] text-hx-text2 flex items-center gap-1">
            <Icon name="pin" size={12} /> <span className="truncate">{event.location}</span>
          </div>
        )}
        {event.description && <p className="text-[13px] text-hx-text2 line-clamp-2 break-words">{event.description}</p>}
        <div
          onClick={() => event.host?._id && navigate(`/profile/${event.host._id}`)}
          className="flex items-center gap-1.5 text-[13px] text-hx-text2 cursor-pointer hover:underline mt-1"
        >
          <Avatar src={event.host?.avatar} name={event.host?.name} size={20} style={{ fontSize: 9 }} />
          {event.isHost ? t("events.hostedByYou") : t("events.hostedBy", { name: event.host?.name })}
          <span>· {t("events.goingCount", { count: event.goingCount })}</span>
        </div>
        <div className="mt-auto pt-2 flex gap-2">
          {event.isHost ? (
            confirming ? (
              <>
                <button onClick={() => setConfirming(false)} className="hx-btn flex-1 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                  {t("events.keep")}
                </button>
                <button onClick={onDelete} disabled={busy} className="hx-btn flex-1 bg-[#e41e3f] text-white hover:brightness-95">
                  {t("events.deleteEvent")}
                </button>
              </>
            ) : (
              <>
                <span className="hx-btn flex-1 bg-hx-accent-soft text-hx-accent cursor-default">
                  <Icon name="calendar" size={16} /> {t("events.youreHosting")}
                </span>
                <button onClick={() => setConfirming(true)} aria-label={t("events.deleteEvent")} className="hx-btn w-10 px-0 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                  <Icon name="trash" size={16} />
                </button>
              </>
            )
          ) : (
            <button
              onClick={onToggleGoing}
              disabled={busy}
              className={`hx-btn w-full ${event.isGoing ? "bg-hx-btn text-hx-text hover:bg-hx-btnh" : "bg-hx-accent-soft text-hx-accent hover:brightness-95"}`}
            >
              {event.isGoing && <Icon name="check" size={16} sw={2.4} />}
              {event.isGoing ? t("events.going") : t("events.imGoing")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(() => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    return { title: "", startsAt: toLocalInput(start), location: "", description: "" };
  });
  const [cover, setCover] = useState(null); // { file, url }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => () => cover && URL.revokeObjectURL(cover.url), [cover]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickCover = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setError(t("common.coverRules"));
      return;
    }
    setError("");
    setCover({ file, url: URL.createObjectURL(file) });
  };

  const ready = form.title.trim() && form.startsAt;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("startsAt", new Date(form.startsAt).toISOString());
      if (form.location.trim()) body.append("location", form.location.trim());
      if (form.description.trim()) body.append("description", form.description.trim());
      if (cover) body.append("coverImage", cover.file);
      const { data } = await api.post("/events", body);
      onCreated(data.event);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || t("events.createFailed"));
      setSaving(false);
    }
  };

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-[var(--overlay)] flex items-center justify-center p-4 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("events.create")}
        className="w-[520px] max-w-full max-h-[calc(100vh-32px)] overflow-auto bg-hx-card rounded-lg shadow-hx-pop animate-hx-pop"
      >
        <div className="sticky top-0 z-[1] bg-hx-card h-[60px] flex items-center justify-center border-b border-hx-border">
          <div className="text-xl font-bold">{t("events.create")}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="hx-icon-btn absolute right-4">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-36 rounded-lg overflow-hidden border-2 border-dashed border-hx-border text-hx-text2 flex flex-col items-center justify-center gap-1 hover:bg-hx-hover"
          >
            {cover ? (
              <img src={cover.url} alt={t("common.coverPreview")} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Icon name="image" size={22} />
                <span className="text-[13px] font-semibold">{t("common.addCoverOptional")}</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={pickCover} className="hidden" />
          <input autoFocus value={form.title} onChange={set("title")} placeholder={t("events.name")} maxLength={100} className={field} />
          <label className="flex flex-col gap-1 text-[13px] text-hx-text2">
            {t("events.starts")}
            <input type="datetime-local" value={form.startsAt} min={toLocalInput(new Date())} onChange={set("startsAt")} className={field} />
          </label>
          <input value={form.location} onChange={set("location")} placeholder={t("events.locationOptional")} maxLength={100} className={field} />
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder={t("events.detailsPlaceholder")}
            maxLength={2000}
            className={`${field} h-24 py-2.5 resize-none`}
          />
          {error && <p className="text-red-500 text-[13px]">{error}</p>}
          <button
            onClick={submit}
            disabled={!ready || saving}
            className="w-full h-9 border-0 rounded-md font-semibold text-[15px] transition-colors disabled:cursor-not-allowed"
            style={{ background: ready ? "rgb(var(--accent))" : "rgb(var(--btn))", color: ready ? "#fff" : "rgb(var(--text2))" }}
          >
            {saving ? t("common.creating") : t("events.create")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Events: upcoming events (or the ones you host / attend), RSVP with
// "I'm going", and create your own. Header Create > Event opens the composer
// via location state { create: true }.
export default function Events() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [scope, setScope] = useState("upcoming"); // upcoming | mine
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!location.state?.create) return;
    setCreating(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get("/events", { params: scope === "mine" ? { mine: 1 } : {} })
      .then(({ data }) => !cancelled && setEvents(data.events))
      .catch(() => !cancelled && setError(t("events.loadFailed")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const replace = (ev) => setEvents((prev) => prev.map((x) => (x._id === ev._id ? ev : x)));

  const toggleGoing = async (ev) => {
    setBusy(ev._id);
    try {
      const { data } = await api.post(`/events/${ev._id}/going`);
      if (scope === "mine" && !data.event.isGoing && !data.event.isHost) setEvents((prev) => prev.filter((x) => x._id !== ev._id));
      else replace(data.event);
    } catch (err) {
      setError(err.response?.data?.message || t("events.rsvpFailed"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (ev) => {
    setBusy(ev._id);
    try {
      await api.delete(`/events/${ev._id}`);
      setEvents((prev) => prev.filter((x) => x._id !== ev._id));
    } catch (err) {
      setError(err.response?.data?.message || t("events.deleteFailed"));
    } finally {
      setBusy(null);
    }
  };

  const chip = (active) =>
    `h-9 px-3 rounded-[18px] border-0 font-semibold text-[15px] whitespace-nowrap transition-colors ${
      active ? "bg-hx-accent-soft text-hx-accent" : "bg-hx-card text-hx-text hover:bg-hx-hover"
    }`;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1100px] mx-auto py-6 px-2 min-[600px]:px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{t("nav.events")}</h1>
          <button onClick={() => setCreating(true)} className="hx-btn bg-hx-accent text-white hover:brightness-95">
            <Icon name="plus" size={16} sw={2.4} /> {t("events.create")}
          </button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setScope("upcoming")} className={chip(scope === "upcoming")}>
            {t("events.upcoming")}
          </button>
          <button onClick={() => setScope("mine")} className={chip(scope === "mine")}>
            {t("events.yours")}
          </button>
        </div>
        {error && <div role="alert" className="card px-4 py-3 text-red-500">{error}</div>}
        {loading ? (
          <Loader />
        ) : events.length === 0 ? (
          <div className="card p-10 text-center text-hx-text2">
            {scope === "mine" ? t("events.noneMine") : t("events.noneUpcoming")}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {events.map((ev) => (
              <EventCard key={ev._id} event={ev} busy={busy === ev._id} onToggleGoing={() => toggleGoing(ev)} onDelete={() => remove(ev)} />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={(ev) => {
            setCreating(false);
            setEvents((prev) => [...prev, ev].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)));
          }}
        />
      )}
    </div>
  );
}
