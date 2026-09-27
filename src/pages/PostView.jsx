import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Loader from "../components/Loader";
import PostCard from "../components/PostCard";
import PhotoTheater from "../components/PhotoTheater";
import { useLanguage } from "../context/LanguageContext";

// One post on its own page (/posts/:id): where notifications and copied
// post links lead. Comments start expanded.
export default function PostView() {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | missing
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .get(`/posts/${id}`)
      .then(({ data }) => {
        if (cancelled) return;
        setPost(data.post);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Same contract as usePostFeed's updatePost (patch object or function).
  const updatePost = useCallback(
    (_id, patch) => setPost((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) })),
    []
  );

  return (
    <div className="min-h-screen bg-hx-bg">
      <Header />
      <main className="max-w-[590px] mx-auto py-4 px-2 min-[600px]:py-6 flex flex-col gap-4">
        {status === "loading" && <Loader />}
        {status === "missing" && (
          <div className="card p-8 text-center">
            <div className="text-xl font-bold mb-2">{t("shared.postUnavailableTitle")}</div>
            <p className="text-hx-text2 mb-4">{t("shared.postUnavailableText")}</p>
            <Link to="/" className="hx-btn inline-flex bg-hx-accent text-white hover:brightness-95">
              {t("shared.goToFeed")}
            </Link>
          </div>
        )}
        {status === "ready" && post && (
          <PostCard
            post={post}
            initialComments
            onUpdate={(patch) => updatePost(post._id, patch)}
            onDeleted={() => navigate("/", { replace: true })}
            onOpenPhoto={() => setPhotoOpen(true)}
          />
        )}
      </main>

      {photoOpen && post?.image && (
        <PhotoTheater posts={[post]} startId={post._id} onClose={() => setPhotoOpen(false)} onUpdate={updatePost} />
      )}
    </div>
  );
}
