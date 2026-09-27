import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { formatPrice, timeAgo } from "../../utils/format";
import { categoryLabel, conditionLabel } from "./CreateListingModal";
import resolveImage from "../../utils/resolveImage";
import { useLanguage } from "../../context/LanguageContext";
import { useReport } from "../../context/ReportContext";
import MoreMenu from "../MoreMenu";

// Listing detail: image gallery (arrow keys / thumbnails) + details panel.
// Buyers get "Message seller" (opens the Messenger chat with the listing
// attached); the seller can mark it sold or delete it.
export default function ItemModal({ itemId, onClose, onChanged, onDeleted }) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const { t } = useLanguage();
  const report = useReport();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setItem(null);
    setIndex(0);
    setError("");
    api
      .get(`/marketplace/${itemId}`)
      .then(({ data }) => setItem(data.item))
      .catch(() => setError(t("marketplace.unavailable")));
  }, [itemId]);

  const images = item?.imageUrls || [];
  const step = (d) => images.length > 1 && setIndex((i) => (i + d + images.length) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, images.length]);

  const isSeller = item && item.seller?._id === user?._id;
  const sold = item?.status === "sold";

  const messageSeller = () => {
    openChat({
      _id: item.seller._id,
      name: item.seller.name,
      avatar: item.seller.avatar,
      item: { _id: item._id, title: item.title, price: item.price, imageUrls: item.imageUrls, status: item.status },
    });
    onClose();
  };

  const toggleSold = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/marketplace/${item._id}/status`, { status: sold ? "available" : "sold" });
      setItem(data.item);
      onChanged?.(data.item);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || t("marketplace.updateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/marketplace/${item._id}`);
      onDeleted?.(item._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("marketplace.deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/marketplace?item=${item._id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const navBtn =
    "absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center";

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-0 min-[900px]:p-6 animate-hx-fade">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item?.title || t("marketplace.listing")}
        className="relative w-full h-full min-[900px]:w-[min(1180px,100%)] min-[900px]:h-[min(760px,100%)] bg-hx-card min-[900px]:rounded-lg overflow-hidden flex flex-col min-[900px]:flex-row shadow-hx-pop animate-hx-pop"
      >
        <button onClick={onClose} aria-label={t("common.close")} className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">
          <Icon name="x" size={20} />
        </button>

        {!item ? (
          <div className="flex-1 flex items-center justify-center text-hx-text2 p-8">{error || t("common.loading")}</div>
        ) : (
          <>
            {/* gallery */}
            <div className="relative bg-black flex-shrink-0 h-[45vh] min-[900px]:h-auto min-[900px]:flex-1 flex flex-col">
              <div className="relative flex-1 min-h-0 flex items-center justify-center">
                <img
                  key={images[index]}
                  src={resolveImage(images[index])}
                  alt={t("marketplace.photoAlt", { title: item.title, n: index + 1 })}
                  className="max-w-full max-h-full object-contain animate-hx-fade"
                />
                {sold && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-md bg-black/70 text-white font-bold tracking-wide text-sm">{t("marketplace.soldBadge")}</span>
                )}
                {images.length > 1 && (
                  <>
                    <button onClick={() => step(-1)} aria-label={t("common.previousPhoto")} className={`${navBtn} left-4`}>
                      <Icon name="chevLeft" size={22} />
                    </button>
                    <button onClick={() => step(1)} aria-label={t("common.nextPhoto")} className={`${navBtn} right-4`}>
                      <Icon name="chevRight" size={22} />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex justify-center gap-2 p-3">
                  {images.map((src, i) => (
                    <button
                      key={`${i}-${src}`}
                      onClick={() => setIndex(i)}
                      aria-label={t("marketplace.photoN", { n: i + 1 })}
                      className={`w-14 h-14 rounded-md overflow-hidden border-2 ${i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={resolveImage(src)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* details */}
            <div className="w-full min-[900px]:w-[380px] flex-1 min-[900px]:flex-none overflow-y-auto p-4 flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-bold leading-tight break-words">{item.title}</h2>
                <div className="text-[17px] font-semibold mt-1">
                  {formatPrice(item.price)}
                  {sold && <span className="ml-2 text-[13px] font-semibold text-[#e41e3f]">{t("marketplace.sold")}</span>}
                </div>
                <div className="text-[13px] text-hx-text2 mt-1">
                  {t("marketplace.listedIn", { time: timeAgo(item.createdAt), location: item.location })}
                </div>
              </div>

              <div className="flex gap-2">
                {isSeller ? (
                  <>
                    <button onClick={toggleSold} disabled={busy} className="hx-btn flex-1 bg-hx-accent text-white hover:brightness-95">
                      <Icon name={sold ? "tag" : "check"} size={16} sw={2.4} />
                      {sold ? t("marketplace.markAvailable") : t("marketplace.markSold")}
                    </button>
                    <button onClick={() => setConfirmDelete(true)} aria-label={t("marketplace.deleteListing")} className="hx-btn w-10 px-0 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                      <Icon name="trash" size={18} />
                    </button>
                  </>
                ) : (
                  <button onClick={messageSeller} className="hx-btn flex-1 bg-hx-accent text-white hover:brightness-95">
                    <Icon name="message" size={16} sw={2.4} />
                    {t("marketplace.messageSeller")}
                  </button>
                )}
                <button onClick={share} aria-label={t("post.copyLink")} title={copied ? t("common.linkCopied") : t("post.copyLink")} className="hx-btn w-10 px-0 bg-hx-btn text-hx-text hover:bg-hx-btnh">
                  <Icon name={copied ? "check" : "share"} size={18} />
                </button>
                {!isSeller && (
                  <MoreMenu
                    buttonClass="hx-btn w-10 px-0 bg-hx-btn text-hx-text hover:bg-hx-btnh"
                    items={[{ icon: "flag", label: t("report.reportListing"), run: () => report({ contentType: "marketplace", targetId: item._id }) }]}
                  />
                )}
              </div>

              {error && <p role="alert" className="text-red-500 text-[13px] -mt-2">{error}</p>}

              {confirmDelete && (
                <div className="rounded-lg border border-hx-border p-3 animate-hx-fade">
                  <p className="font-semibold">{t("marketplace.deleteTitle")}</p>
                  <p className="text-[13px] text-hx-text2 mb-3">{t("post.cannotUndo")}</p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setConfirmDelete(false)} className="hx-btn text-hx-accent hover:bg-hx-hover">
                      {t("common.cancel")}
                    </button>
                    <button onClick={remove} disabled={busy} className="hx-btn bg-[#e41e3f] text-white hover:brightness-95">
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[17px] font-semibold mb-2">{t("marketplace.details")}</div>
                <div className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[15px]">
                  <span className="text-hx-text2">{t("marketplace.condition")}</span>
                  <span>{conditionLabel(t, item.condition)}</span>
                  <span className="text-hx-text2">{t("marketplace.category")}</span>
                  <span>{categoryLabel(t, item.category)}</span>
                </div>
                {item.description && <p className="mt-3 whitespace-pre-wrap break-words text-[15px]">{item.description}</p>}
              </div>

              <div className="h-px bg-hx-border" />

              <div>
                <div className="text-[17px] font-semibold mb-2">{t("marketplace.sellerInfo")}</div>
                <div
                  onClick={() => navigate(`/profile/${item.seller?._id}`)}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg cursor-pointer hover:bg-hx-hover"
                >
                  <Avatar src={item.seller?.avatar} name={item.seller?.name} size={48} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.seller?.name}</div>
                    <div className="text-[13px] text-hx-text2">
                      {t("marketplace.joinedIn", { year: String(new Date(item.seller?.createdAt).getFullYear()) })}
                      {item.seller?.city && ` · ${item.seller.city}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
