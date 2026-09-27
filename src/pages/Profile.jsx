import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import PostList from "../components/PostList";
import usePostFeed from "../hooks/usePostFeed";
import CreatePost from "../components/CreatePost";
import Loader from "../components/Loader";
import Lightbox from "../components/Lightbox";
import PhotoTheater from "../components/PhotoTheater";
import ProfileHeader, { isValidTab, moreItemLabel } from "../components/profile/ProfileHeader";
import EditProfileModal from "../components/profile/EditProfileModal";
import AvatarCropper from "../components/profile/AvatarCropper";
import resolveImage from "../utils/resolveImage";
import { IntroCard, PhotosCard, FriendsCard, AboutTab, FriendsTab, PhotosTab, VideosTab, EmptyTab } from "../components/profile/ProfileSections";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function Profile() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: me, updateUser } = useAuth();
  const { t } = useLanguage();
  const { openChat } = useChat();

  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [myFriendIds, setMyFriendIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { images, index } - cover/avatar
  const [photoId, setPhotoId] = useState(null); // post photo in the viewer
  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(null); // "avatar" | "cover" | null
  const [uploadError, setUploadError] = useState("");
  const [cropFile, setCropFile] = useState(null); // new avatar waiting in the cropper
  const [coverEdit, setCoverEdit] = useState(null); // { file?, url, position } while repositioning
  const [viewerPost, setViewerPost] = useState(null); // avatar/cover post open in the viewer

  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const isMe = me?._id === id;
  const tabParam = searchParams.get("tab");
  const tab = isValidTab(tabParam) ? tabParam : "posts";

  const setTab = (key) => setSearchParams(key === "posts" ? {} : { tab: key }, { replace: true });

  const loadFriends = useCallback(() => {
    api
      .get(`/users/${id}/friends`)
      .then(({ data }) => setFriends(data.friends))
      .catch(() => setFriends([]));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setFriends([]);
    setFriendStatus(null);
    setLightbox(null);
    setPhotoId(null);
    setViewerPost(null);
    setCoverEdit(null);
    setCropFile(null);

    api
      .get(`/users/${id}`)
      .then(({ data }) => !cancelled && setProfile(data.user))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    loadFriends();

    if (!isMe) {
      api
        .get("/friends")
        .then(({ data }) => !cancelled && setMyFriendIds(data.friends.map((f) => f._id)))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [id, isMe, loadFriends]);

  // Friends list changes when the viewer (un)friends this profile.
  const handleFriendStatus = (status) => {
    if (friendStatus !== null && status !== friendStatus) loadFriends();
    setFriendStatus(status);
  };

  const mutualCount = useMemo(() => {
    const mine = new Set(myFriendIds);
    return friends.filter((f) => mine.has(f._id)).length;
  }, [friends, myFriendIds]);

  const feed = usePostFeed({ author: id }, { limit: 20 });
  const { posts, setPosts } = feed;
  const photoPosts = useMemo(() => posts.filter((p) => p.image), [posts]);
  const photos = useMemo(() => photoPosts.map((p) => p.image), [photoPosts]);

  const applyUser = (user) => {
    setProfile((prev) => ({ ...prev, ...user }));
    updateUser(user);
  };

  // Checks a picked file; returns it if usable, otherwise shows why not.
  const validImage = (file) => {
    setUploadError("");
    if (!file) return null;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setUploadError(t("profile.imageType"));
      return null;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t("profile.imageSize"));
      return null;
    }
    return file;
  };

  // Uploads a new avatar/cover. The server also publishes an "updated their
  // profile picture / cover photo" post, which goes straight into this feed.
  const upload = async (kind, file, extra = {}) => {
    const formData = new FormData();
    formData.append(kind, file);
    Object.entries(extra).forEach(([k, v]) => formData.append(k, String(v)));
    setUploading(kind);
    try {
      const { data } = await api.post(`/users/${kind}`, formData);
      applyUser(data.user);
      if (data.post) setPosts((prev) => [data.post, ...prev.filter((p) => p._id !== data.post._id)]);
      return true;
    } catch (err) {
      setUploadError(err.response?.data?.message || t("profile.uploadFailed"));
      return false;
    } finally {
      setUploading(null);
    }
  };

  const pickAvatar = (file) => {
    if (validImage(file)) setCropFile(file);
  };

  const saveCroppedAvatar = async (file) => {
    if (await upload("avatar", file)) setCropFile(null);
  };

  const pickCover = (file) => {
    if (!validImage(file)) return;
    setEditOpen(false);
    setCoverEdit((prev) => {
      if (prev?.file) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file), position: 50 };
    });
  };

  const repositionCover = () =>
    setCoverEdit({ url: resolveImage(profile.coverImage), position: profile.coverPosition ?? 50 });

  const cancelCoverEdit = () => {
    if (coverEdit?.file) URL.revokeObjectURL(coverEdit.url);
    setCoverEdit(null);
  };

  const saveCover = async () => {
    if (!coverEdit) return;
    const position = Math.round(coverEdit.position * 10) / 10;
    if (coverEdit.file) {
      if (await upload("cover", coverEdit.file, { position })) cancelCoverEdit();
      return;
    }
    setUploading("cover");
    try {
      const { data } = await api.patch("/users/cover-position", { position });
      applyUser(data.user);
      setCoverEdit(null);
    } catch (err) {
      setUploadError(err.response?.data?.message || t("profile.uploadFailed"));
    } finally {
      setUploading(null);
    }
  };

  // Clicking the avatar/cover opens its post in the photo viewer (reactions,
  // comments, share). The server returns the linked post, creating one for
  // photos set before photo posts existed.
  const viewProfilePhoto = async (kind) => {
    const image = kind === "avatar" ? profile.avatar : profile.coverImage;
    if (!image) return;
    const postId = kind === "avatar" ? profile.avatarPostId : profile.coverPostId;
    const loaded = postId && posts.find((p) => p._id === postId && p.image === image);
    if (loaded) return setViewerPost(loaded);
    try {
      const { data } = await api.get(`/users/${profile._id}/photo-post`, { params: { kind } });
      setViewerPost(data.post);
      setProfile((prev) => ({ ...prev, [kind === "avatar" ? "avatarPostId" : "coverPostId"]: data.post._id }));
    } catch {
      setLightbox({ images: [image], index: 0 }); // viewer without reactions as a last resort
    }
  };

  const updateViewerPost = (postId, patch) => {
    setViewerPost((p) => (p && p._id === postId ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p));
    feed.updatePost(postId, patch);
  };

  const saveProfile = async (fields) => {
    const { data } = await api.put("/auth/me", fields);
    applyUser(data.user);
  };

  const unfriend = async (friend) => {
    setFriends((prev) => prev.filter((f) => f._id !== friend._id));
    try {
      await api.delete(`/friends/${friend._id}`);
    } catch {
      loadFriends();
    }
  };

  const openPhotos = (index) => setPhotoId(photoPosts[index]?._id || null);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <Loader />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="card max-w-md mx-auto mt-16 p-8 text-center">
          <div className="text-xl font-bold mb-2">{t("profile.unavailableTitle")}</div>
          <p className="text-hx-text2">{t("profile.unavailableText")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <Header />

      <ProfileHeader
        profile={profile}
        isMe={isMe}
        friends={friends}
        mutualCount={mutualCount}
        friendStatus={friendStatus}
        onFriendStatusChange={handleFriendStatus}
        tab={tab}
        onTabChange={setTab}
        uploading={uploading}
        onPickCover={() => coverInputRef.current?.click()}
        onPickAvatar={() => avatarInputRef.current?.click()}
        coverEdit={coverEdit}
        coverSaving={uploading === "cover"}
        onRepositionCover={repositionCover}
        onCoverPositionChange={(position) => setCoverEdit((c) => c && { ...c, position })}
        onCoverSave={saveCover}
        onCoverCancel={cancelCoverEdit}
        onViewCover={() => viewProfilePhoto("cover")}
        onViewAvatar={() => viewProfilePhoto("avatar")}
        onEditProfile={() => setEditOpen(true)}
        onAddStory={() => navigate("/", { state: { compose: "story" } })}
        onMessage={() => openChat(profile)}
      />

      {isMe && (
        <>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              pickCover(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              pickAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}

      {uploadError && (
        <div role="alert" className="max-w-[1100px] mx-auto mt-4 px-4">
          <div className="card px-4 py-3 text-red-500 flex justify-between gap-3">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError("")} className="text-hx-text2 hover:underline">
              {t("common.dismiss")}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-2 py-4 min-[600px]:p-4 flex flex-wrap gap-4 items-start">
        {tab === "posts" && (
          <>
            <div className="w-full min-[900px]:w-[calc(42%-8px)] flex flex-col gap-4 animate-hx-fade min-[900px]:sticky min-[900px]:top-[72px]">
              <IntroCard
                profile={profile}
                isMe={isMe}
                onSaveBio={(bio) => saveProfile({ bio })}
                onEditDetails={() => setEditOpen(true)}
              />
              <PhotosCard photos={photos} onOpen={openPhotos} onSeeAll={() => setTab("photos")} />
              <FriendsCard friends={friends} mutualCount={mutualCount} isMe={isMe} onSeeAll={() => setTab("friends")} />
              <div className="text-[13px] text-hx-text2 px-2 leading-relaxed">
                {t("common.footer")}
              </div>
            </div>

            <div className="flex-1 basis-0 min-w-[min(100%,320px)] flex flex-col gap-4">
              {isMe && <CreatePost onCreated={(post) => setPosts((prev) => [post, ...prev])} />}
              <div className="card px-4 py-3 flex items-center justify-between">
                <div className="text-xl font-bold">{t("profile.posts")}</div>
                <div className="text-[15px] text-hx-text2">
                  {feed.hasMore ? t("profile.postsCountMore", { n: posts.length }) : t("profile.postsCount", { count: posts.length })}
                </div>
              </div>
              <PostList feed={feed} acceptShares={isMe} />
            </div>
          </>
        )}

        {tab === "about" && <AboutTab profile={profile} isMe={isMe} onEditDetails={() => setEditOpen(true)} />}

        {tab === "friends" && (
          <FriendsTab
            friends={friends}
            isMe={isMe}
            onMessage={openChat}
            onUnfriend={unfriend}
            onRequestHandled={(_, action) => action === "accept" && loadFriends()}
          />
        )}

        {tab === "photos" && <PhotosTab photos={photos} onOpen={openPhotos} />}

        {tab === "videos" && <VideosTab userId={id} />}
        {tab.startsWith("more:") && <EmptyTab title={moreItemLabel(t, tab.slice(5))} />}
      </div>

      {editOpen && (
        <EditProfileModal
          profile={profile}
          uploading={uploading}
          onPickAvatar={() => avatarInputRef.current?.click()}
          onPickCover={() => coverInputRef.current?.click()}
          onSave={saveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}

      {cropFile && (
        <AvatarCropper
          file={cropFile}
          saving={uploading === "avatar"}
          onSave={saveCroppedAvatar}
          onClose={() => uploading !== "avatar" && setCropFile(null)}
        />
      )}
      {viewerPost && (
        <PhotoTheater
          posts={[viewerPost]}
          startId={viewerPost._id}
          onClose={() => setViewerPost(null)}
          onUpdate={updateViewerPost}
          onShared={({ post }) => isMe && post && setPosts((prev) => [post, ...prev])}
        />
      )}
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
      {photoId && (
        <PhotoTheater
          posts={photoPosts}
          startId={photoId}
          onClose={() => setPhotoId(null)}
          onUpdate={feed.updatePost}
          onShared={({ post }) => isMe && post && setPosts((prev) => [post, ...prev])}
        />
      )}
    </div>
  );
}
