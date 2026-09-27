import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import CreatePost from "../components/CreatePost";
import PostList from "../components/PostList";
import Lightbox from "../components/Lightbox";
import EntityHero from "../components/entity/EntityHero";
import usePostFeed from "../hooks/usePostFeed";
import { formatDate } from "../utils/format";
import { topicLabel } from "../utils/topics";
import { useLanguage } from "../context/LanguageContext";
import { useReport } from "../context/ReportContext";
import MoreMenu from "../components/MoreMenu";

// Group preview: cover + Join/Leave, an About card, and the group's posts
// (hidden for private groups until you join).
export default function GroupView() {
  const { id } = useParams();
  const { t } = useLanguage();
  const report = useReport();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | missing
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cover, setCover] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setStatus("loading");
    api
      .get(`/groups/${id}`)
      .then(({ data }) => {
        setGroup(data.group);
        setStatus("ready");
      })
      .catch(() => setStatus("missing"));
  }, [id]);

  const canSee = group && (group.privacy === "public" || group.isMember);
  const feed = usePostFeed({ group: id }, { enabled: !!canSee });

  const toggleMembership = async () => {
    setBusy(true);
    setMenuOpen(false);
    try {
      const { data } = await api.post(`/groups/${id}/${group.isMember ? "leave" : "join"}`);
      setGroup((g) => ({ ...g, ...data.group }));
      setActionError("");
    } catch (err) {
      setActionError(err.response?.data?.message || t("groups.membershipFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen">
        <Header />
        {status === "loading" ? (
          <Loader />
        ) : (
          <div className="card max-w-md mx-auto mt-16 p-8 text-center">
            <div className="text-xl font-bold mb-2">{t("groups.unavailable")}</div>
            <button onClick={() => navigate("/groups")} className="hx-btn mx-auto bg-hx-accent text-white">
              {t("groups.browse")}
            </button>
          </div>
        )}
      </div>
    );
  }

  const isPrivate = group.privacy === "private";

  return (
    <div className="min-h-screen pb-8">
      <Header />
      <EntityHero
        name={group.name}
        coverImage={group.coverImage}
        onViewCover={() => setCover(true)}
        people={group.previewMembers}
        subtitle={
          <>
            <Icon name={isPrivate ? "lock" : "globe"} size={14} />
            {isPrivate ? t("groups.privateGroup") : t("groups.publicGroup")} · {t("groups.members", { count: group.memberCount })}
          </>
        }
        actions={
          group.isMember ? (
            <>
              <button onClick={() => setMenuOpen((o) => !o)} disabled={busy} className="hx-btn bg-hx-btn text-hx-text hover:bg-hx-btnh">
                <Icon name="userCheck" size={16} sw={2.4} />
                <span>{t("groups.joined")}</span>
                <Icon name="chevDown" size={10} sw={3} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-[25]" onClick={() => setMenuOpen(false)} />
                  <div className="panel absolute top-11 right-0 w-56 p-2 z-[26] text-left">
                    <div onClick={toggleMembership} className="flex items-center gap-3 p-2 rounded-md cursor-pointer font-medium hover:bg-hx-hover">
                      <Icon name="logout" size={20} /> <span>{t("groups.leave")}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <button onClick={toggleMembership} disabled={busy} className="hx-btn bg-hx-accent text-white hover:brightness-95">
              <Icon name="userPlus" size={16} sw={2.4} />
              <span>{t("groups.join")}</span>
            </button>
          )
        }
        extraActions={
          <MoreMenu
            buttonClass="w-12 h-9 border-0 rounded-md bg-hx-btn text-hx-text flex items-center justify-center cursor-pointer hover:bg-hx-btnh"
            items={[{ icon: "flag", label: t("report.reportGroup"), run: () => report({ contentType: "group", targetId: group._id }) }]}
          />
        }
      />

      <div className="max-w-[1100px] mx-auto px-2 py-4 min-[600px]:p-4 flex flex-wrap gap-4 items-start">
        <div className="flex-1 basis-0 min-w-[min(100%,320px)] flex flex-col gap-4">
          {actionError && <div role="alert" className="card px-4 py-3 text-red-500">{actionError}</div>}
          {group.isMember && <CreatePost target={{ group }} onCreated={(post) => feed.setPosts((prev) => [post, ...prev])} />}
          {canSee ? (
            <PostList feed={feed} hideGroup empty={t("groups.noPosts")} />
          ) : (
            <div className="card p-8 text-center flex flex-col items-center gap-2">
              <span className="w-14 h-14 rounded-full bg-hx-btn text-hx-text2 flex items-center justify-center">
                <Icon name="lock" size={24} />
              </span>
              <div className="text-xl font-bold">{t("groups.isPrivate")}</div>
              <div className="text-hx-text2">{t("groups.joinToView")}</div>
            </div>
          )}
        </div>

        <aside className="order-first min-[900px]:order-none w-full min-[900px]:w-[calc(40%-8px)] min-[900px]:sticky min-[900px]:top-[72px] flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3.5">
            <div className="text-xl font-bold">{t("profile.about")}</div>
            {group.description && <div className="break-words">{group.description}</div>}
            <Detail icon={isPrivate ? "lock" : "globe"} title={isPrivate ? t("groups.private") : t("groups.public")}>
              {isPrivate ? t("groups.privateText") : t("groups.publicText")}
            </Detail>
            <Detail icon="flag" title={topicLabel(t, group.category)}>
              {t("groups.topicLabel")}
            </Detail>
            <Detail icon="clock" title={t("groups.history")}>
              {t("groups.createdOn", { date: formatDate(group.createdAt, { month: "long", day: "numeric", year: "numeric" }) })}
            </Detail>
          </div>
          {group.admins?.length > 0 && (
            <div className="card p-4">
              <div className="text-xl font-bold mb-2">{t("groups.admins")}</div>
              {group.admins.map((a) => (
                <div key={a._id} onClick={() => navigate(`/profile/${a._id}`)} className="flex items-center gap-3 p-2 -mx-2 rounded-lg cursor-pointer hover:bg-hx-hover">
                  <Avatar src={a.avatar} name={a.name} size={36} />
                  <span className="font-medium">{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {cover && group.coverImage && <Lightbox
          images={[group.coverImage]}
          onClose={() => setCover(false)}
          report={{ contentType: "group", targetId: group._id, label: t("report.reportGroup") }}
        />}
    </div>
  );
}

function Detail({ icon, title, children }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-hx-text2 pt-0.5">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-[13px] text-hx-text2">{children}</div>
      </div>
    </div>
  );
}
