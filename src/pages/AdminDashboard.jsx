import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, MessageSquare, ShieldCheck, Ban, Trash2, ShieldOff, Flag, CheckCircle2, RotateCcw, ExternalLink } from "lucide-react";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import { useLanguage } from "../context/LanguageContext";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-fb-muted dark:text-fb-muted-dark">{label}</p>
      </div>
    </div>
  );
}

// Where a reported item can be opened for review.
function reportLink(r) {
  const id = r.targetId;
  switch (r.contentType) {
    case "post":
    case "photo":
      return `/posts/${id}`;
    case "reel":
    case "video":
      return `/watch?reel=${id}`;
    case "profile":
      return `/profile/${id}`;
    case "group":
      return `/groups/${id}`;
    case "page":
      return `/pages/${id}`;
    case "marketplace":
      return `/marketplace?item=${id}`;
    case "comment":
      if (r.parentType === "post") return `/posts/${r.parentId}`;
      if (r.parentType === "reel") return `/watch?reel=${r.parentId}`;
      return null;
    default:
      return null;
  }
}

// Report tickets from POST /reports, filtered by status. Admins open the
// reported content and mark tickets resolved (or reopen them).
function ReportsPanel({ onError }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState("pending");
  const [data, setData] = useState(null); // { reports, counts }

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .get("/admin/reports", { params: status === "all" ? {} : { status } })
      .then(({ data }) => !cancelled && setData(data))
      .catch((err) => {
        if (cancelled) return;
        onError(err.response?.data?.message || t("admin.loadFailed"));
        setData({ reports: [], counts: {} });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const setReportStatus = async (report, next) => {
    try {
      onError("");
      await api.patch(`/admin/reports/${report._id}/${next === "resolved" ? "resolve" : "reopen"}`);
      setData((d) => ({
        counts: {
          pending: (d.counts.pending || 0) + (next === "pending" ? 1 : -1),
          resolved: (d.counts.resolved || 0) + (next === "resolved" ? 1 : -1),
        },
        // In a filtered view the ticket moves over to the other list.
        reports:
          status === "all"
            ? d.reports.map((r) => (r._id === report._id ? { ...r, status: next } : r))
            : d.reports.filter((r) => r._id !== report._id),
      }));
    } catch (err) {
      onError(err.response?.data?.message || t("common.somethingWrong"));
    }
  };

  const filters = [
    ["pending", t("admin.reportsPending"), data?.counts?.pending],
    ["resolved", t("admin.reportsResolved"), data?.counts?.resolved],
    ["all", t("admin.reportsAll")],
  ];

  return (
    <div className="card overflow-x-auto">
      <div className="flex gap-2 p-3 border-b border-fb-border dark:border-fb-border-dark">
        {filters.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === key ? "bg-fb-blue text-white" : "bg-fb-bg dark:bg-fb-bg-dark text-fb-muted dark:text-fb-muted-dark"
            }`}
          >
            {label}
            {count != null && ` (${count})`}
          </button>
        ))}
      </div>
      {!data ? (
        <Loader />
      ) : data.reports.length === 0 ? (
        <p className="p-6 text-center text-fb-muted dark:text-fb-muted-dark">{t("admin.noReports")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-fb-bg dark:bg-fb-bg-dark text-left">
            <tr>
              <th className="p-3">{t("admin.col.reporter")}</th>
              <th className="p-3">{t("admin.col.type")}</th>
              <th className="p-3">{t("admin.col.reason")}</th>
              <th className="p-3">{t("admin.col.comment")}</th>
              <th className="p-3">{t("admin.col.reported")}</th>
              <th className="p-3">{t("admin.col.status")}</th>
              <th className="p-3 text-right">{t("admin.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.reports.map((r) => {
              const link = reportLink(r);
              const pending = r.status === "pending";
              return (
                <tr key={r._id} className="border-t border-fb-border dark:border-fb-border-dark align-top">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={r.reporterId?.avatar} name={r.reporterId?.name} size="sm" />
                      {r.reporterId?.name || t("admin.unknown")}
                    </div>
                  </td>
                  <td className="p-3">{t(`admin.contentTypes.${r.contentType}`)}</td>
                  <td className="p-3">{t(`report.reasons.${r.reason}`)}</td>
                  <td className="p-3 max-w-xs whitespace-pre-wrap break-words">
                    {r.comment || <span className="text-fb-muted dark:text-fb-muted-dark">-</span>}
                  </td>
                  <td className="p-3 text-fb-muted dark:text-fb-muted-dark whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        pending
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {pending ? t("admin.reportsPending") : t("admin.reportsResolved")}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {link && (
                        <Link
                          to={link}
                          title={t("admin.viewContent")}
                          aria-label={t("admin.viewContent")}
                          className="p-2 rounded-md hover:bg-fb-bg dark:hover:bg-fb-bg-dark"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      )}
                      <button
                        onClick={() => setReportStatus(r, pending ? "resolved" : "pending")}
                        title={pending ? t("admin.resolve") : t("admin.reopen")}
                        aria-label={pending ? t("admin.resolve") : t("admin.reopen")}
                        className="p-2 rounded-md hover:bg-fb-bg dark:hover:bg-fb-bg-dark text-green-600"
                      >
                        {pending ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, postsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/posts"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setPosts(postsRes.data.posts);
    } catch (err) {
      setError(err.response?.data?.message || t("admin.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Runs an admin action, surfacing a failure in the page's error banner
  // instead of leaving an unhandled promise rejection.
  const attempt = async (action, fallback) => {
    try {
      setError("");
      await action();
    } catch (err) {
      setError(err.response?.data?.message || fallback);
    }
  };

  const toggleStatus = (userId) =>
    attempt(async () => {
      const { data } = await api.patch(`/admin/users/${userId}/status`);
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
    }, "Couldn't change this user's status");

  const changeRole = (userId, role) =>
    attempt(async () => {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
    }, "Couldn't change this user's role");

  const deleteUser = (userId) => {
    if (!window.confirm(t("admin.confirmDeleteUser"))) return;
    return attempt(async () => {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setStats((prev) => prev && { ...prev, totalUsers: prev.totalUsers - 1 });
    }, "Couldn't delete this user");
  };

  const deletePost = (postId) => {
    if (!window.confirm(t("post.deleteTitle"))) return;
    return attempt(async () => {
      await api.delete(`/admin/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setStats((prev) => prev && { ...prev, totalPosts: prev.totalPosts - 1 });
    }, "Couldn't delete this post");
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="text-fb-blue" /> {t("nav.adminDashboard")}
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label={t("admin.totalUsers")} value={stats.totalUsers} color="bg-fb-blue" />
              <StatCard icon={FileText} label={t("admin.totalPosts")} value={stats.totalPosts} color="bg-fb-green" />
              <StatCard icon={MessageSquare} label={t("admin.totalComments")} value={stats.totalComments} color="bg-purple-500" />
              <StatCard icon={Ban} label={t("admin.blockedUsers")} value={stats.blockedUsers} color="bg-red-500" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab("users")}
                className={`px-4 py-2 rounded-md text-sm font-semibold ${
                  tab === "users" ? "bg-fb-blue text-white" : "card text-fb-muted dark:text-fb-muted-dark"
                }`}
              >
                {t("admin.users")}
              </button>
              <button
                onClick={() => setTab("posts")}
                className={`px-4 py-2 rounded-md text-sm font-semibold ${
                  tab === "posts" ? "bg-fb-blue text-white" : "card text-fb-muted dark:text-fb-muted-dark"
                }`}
              >
                {t("admin.content")}
              </button>
              <button
                onClick={() => setTab("reports")}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 ${
                  tab === "reports" ? "bg-fb-blue text-white" : "card text-fb-muted dark:text-fb-muted-dark"
                }`}
              >
                <Flag size={14} /> {t("admin.reports")}
              </button>
            </div>

            {tab === "reports" && <ReportsPanel onError={setError} />}

            {tab === "users" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fb-bg dark:bg-fb-bg-dark text-left">
                    <tr>
                      <th className="p-3">{t("admin.col.user")}</th>
                      <th className="p-3">{t("admin.col.email")}</th>
                      <th className="p-3">{t("admin.col.role")}</th>
                      <th className="p-3">{t("admin.col.status")}</th>
                      <th className="p-3">{t("admin.col.joined")}</th>
                      <th className="p-3 text-right">{t("admin.col.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-t border-fb-border dark:border-fb-border-dark">
                        <td className="p-3">
                          <Link to={`/profile/${u._id}`} className="flex items-center gap-2 hover:underline">
                            <Avatar src={u.avatar} name={u.name} size="sm" />
                            {u.name}
                            {u._id === me?._id && <span className="text-xs text-fb-muted dark:text-fb-muted-dark">({t("admin.you")})</span>}
                          </Link>
                        </td>
                        <td className="p-3 text-fb-muted dark:text-fb-muted-dark">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            disabled={u._id === me?._id}
                            onChange={(e) => changeRole(u._id, e.target.value)}
                            className="input py-1 text-xs w-auto"
                          >
                            <option value="user">{t("admin.roleUser")}</option>
                            <option value="admin">{t("admin.roleAdmin")}</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              u.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {u.isActive ? t("admin.active") : t("admin.blocked")}
                          </span>
                        </td>
                        <td className="p-3 text-fb-muted dark:text-fb-muted-dark">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={u._id === me?._id}
                              onClick={() => toggleStatus(u._id)}
                              title={u.isActive ? t("admin.block") : t("admin.unblock")}
                              aria-label={u.isActive ? t("admin.block") : t("admin.unblock")}
                              className="p-2 rounded-md hover:bg-fb-bg dark:hover:bg-fb-bg-dark disabled:opacity-30"
                            >
                              <ShieldOff size={16} />
                            </button>
                            <button
                              disabled={u._id === me?._id}
                              onClick={() => deleteUser(u._id)}
                              title={t("admin.deleteUser")}
                              aria-label={t("admin.deleteUser")}
                              className="p-2 rounded-md hover:bg-fb-bg dark:hover:bg-fb-bg-dark text-red-500 disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "posts" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fb-bg dark:bg-fb-bg-dark text-left">
                    <tr>
                      <th className="p-3">{t("admin.col.author")}</th>
                      <th className="p-3">{t("admin.col.content")}</th>
                      <th className="p-3">{t("admin.col.likes")}</th>
                      <th className="p-3">{t("admin.col.comments")}</th>
                      <th className="p-3">{t("admin.col.posted")}</th>
                      <th className="p-3 text-right">{t("admin.col.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p._id} className="border-t border-fb-border dark:border-fb-border-dark align-top">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar src={p.author?.avatar} name={p.author?.name} size="sm" />
                            {p.author?.name || t("admin.unknown")}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs truncate">{p.content || <span className="italic text-fb-muted dark:text-fb-muted-dark">({t("admin.imageOnly")})</span>}</td>
                        <td className="p-3">{p.likes?.length || 0}</td>
                        <td className="p-3">{p.comments?.length || 0}</td>
                        <td className="p-3 text-fb-muted dark:text-fb-muted-dark">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => deletePost(p._id)}
                            title={t("post.delete")}
                            aria-label={t("post.delete")}
                            className="p-2 rounded-md hover:bg-fb-bg dark:hover:bg-fb-bg-dark text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
