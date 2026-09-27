import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Icon from "../components/Icon";
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

// Page preview: cover + avatar, Follow toggle, an Intro card and the posts
// the page published. Page admins also get a composer that posts as the page.
export default function PageView() {
  const { id } = useParams();
  const { t } = useLanguage();
  const report = useReport();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [actionError, setActionError] = useState("");
  const feed = usePostFeed({ page: id });

  useEffect(() => {
    setStatus("loading");
    api
      .get(`/pages/${id}`)
      .then(({ data }) => {
        setPage(data.page);
        setStatus("ready");
      })
      .catch(() => setStatus("missing"));
  }, [id]);

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/pages/${id}/follow`);
      setPage((p) => ({ ...p, ...data.page }));
      setActionError("");
    } catch (err) {
      setActionError(err.response?.data?.message || t("pages.followFailed"));
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
            <div className="text-xl font-bold mb-2">{t("pages.unavailable")}</div>
            <button onClick={() => navigate("/pages")} className="hx-btn mx-auto bg-hx-accent text-white">
              {t("pages.browse")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <Header />
      <EntityHero
        name={page.name}
        coverImage={page.coverImage}
        avatar={page.avatar}
        onViewCover={() => setLightbox(page.coverImage)}
        people={page.previewFollowers}
        subtitle={
          <>
            {topicLabel(t, page.category)} · {t("pages.followers", { count: page.followerCount })}
          </>
        }
        actions={
          <>
          <button
            onClick={toggleFollow}
            disabled={busy}
            className={`hx-btn ${page.isFollowing ? "bg-hx-btn text-hx-text hover:bg-hx-btnh" : "bg-hx-accent text-white hover:brightness-95"}`}
          >
            <Icon name={page.isFollowing ? "check" : "like"} size={16} sw={2.4} />
            <span>{page.isFollowing ? t("pages.following") : t("pages.follow")}</span>
          </button>
          <MoreMenu
            buttonClass="w-12 h-9 border-0 rounded-md bg-hx-btn text-hx-text flex items-center justify-center cursor-pointer hover:bg-hx-btnh"
            items={[!page.isAdmin && { icon: "flag", label: t("report.reportPage"), run: () => report({ contentType: "page", targetId: page._id }) }]}
          />
          </>
        }
      />

      <div className="max-w-[1100px] mx-auto px-2 py-4 min-[600px]:p-4 flex flex-wrap gap-4 items-start">
        <aside className="w-full min-[900px]:w-[calc(42%-8px)] min-[900px]:sticky min-[900px]:top-[72px] flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3.5">
            <div className="text-xl font-bold">{t("profile.intro")}</div>
            {page.description && <div className="text-center break-words">{page.description}</div>}
            <Row icon="flag">
              {t("pages.page")} · <b className="font-semibold">{topicLabel(t, page.category)}</b>
            </Row>
            <Row icon="users">
              {t("pages.peopleFollow", { count: page.followerCount })}
            </Row>
            <Row icon="clock">
              {t("pages.created")} <b className="font-semibold">{formatDate(page.createdAt, { month: "long", year: "numeric" })}</b>
            </Row>
          </div>
        </aside>

        <div className="flex-1 basis-0 min-w-[min(100%,320px)] flex flex-col gap-4">
          {actionError && <div role="alert" className="card px-4 py-3 text-red-500">{actionError}</div>}
          {page.isAdmin && <CreatePost target={{ page }} onCreated={(post) => feed.setPosts((prev) => [post, ...prev])} />}
          <div className="card px-4 py-3 text-xl font-bold">{t("profile.posts")}</div>
          <PostList feed={feed} empty={t("pages.noPosts")} />
        </div>
      </div>

      {lightbox && <Lightbox
          images={[lightbox]}
          onClose={() => setLightbox(null)}
          report={page.isAdmin ? undefined : { contentType: "page", targetId: page._id, label: t("report.reportPage") }}
        />}
    </div>
  );
}

function Row({ icon, children }) {
  return (
    <div className="flex gap-3 items-center">
      <span className="text-hx-text2">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
