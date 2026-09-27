import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Icon from "../components/Icon";
import ItemModal from "../components/marketplace/ItemModal";
import CreateListingModal, { CATEGORIES, categoryLabel } from "../components/marketplace/CreateListingModal";
import { formatPrice } from "../utils/format";
import resolveImage from "../utils/resolveImage";
import { useLanguage } from "../context/LanguageContext";

function ItemCard({ item, onOpen }) {
  const { t } = useLanguage();
  const sold = item.status === "sold";
  return (
    <button onClick={onOpen} className="text-left group min-w-0 animate-hx-fade">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-white ring-1 ring-inset ring-hx-border">
        <img
          src={resolveImage(item.imageUrls?.[0])}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${sold ? "opacity-60" : ""}`}
        />
        {sold && <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-bold">{t("marketplace.soldBadge")}</span>}
      </div>
      <div className="pt-1.5">
        <div className="text-[17px] font-semibold leading-tight">{formatPrice(item.price)}</div>
        <div className="text-[15px] leading-snug line-clamp-2 break-words">{item.title}</div>
        <div className="text-[13px] text-hx-text2 truncate">{item.location}</div>
      </div>
    </button>
  );
}

// Marketplace: filters sidebar + listing grid; `?item=<id>` opens a listing.
export default function Marketplace() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  // ?category= preselects a category (e.g. from a sponsored ad's "Learn more").
  const [category, setCategory] = useState(() => {
    const wanted = params.get("category");
    return CATEGORIES.some((c) => c.label === wanted) ? wanted : "All";
  });
  const [price, setPrice] = useState({ min: "", max: "" });
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);

  const openId = params.get("item");
  const openItem = (id) => setParams(id ? { item: id } : {}, { replace: true });

  // Server-side filtering, debounced while typing.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get("/marketplace", {
          params: {
            q: q.trim() || undefined,
            category: category === "All" ? undefined : category,
            minPrice: price.min || undefined,
            maxPrice: price.max || undefined,
            seller: mine ? user?._id : undefined,
            limit: 100,
          },
        })
        .then(({ data }) => !cancelled && setItems(data.items))
        .catch(() => !cancelled && setItems([]))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, category, price.min, price.max, mine, user?._id]);

  const replaceItem = (item) => setItems((prev) => prev.map((x) => (x._id === item._id ? { ...x, ...item } : x)));

  const navRow = (active) =>
    `flex items-center gap-3 w-full p-2 rounded-lg text-left font-medium transition-colors ${active ? "bg-hx-accent-soft" : "hover:bg-hx-hover"}`;
  const iconCircle = (active) =>
    `w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-hx-accent text-white" : "bg-hx-btn text-hx-text"}`;
  const priceInput =
    "w-full h-10 rounded-md border border-hx-border bg-hx-card text-hx-text text-[15px] px-3 outline-none focus:border-hx-accent";

  const title = mine ? t("marketplace.yourListings") : category === "All" ? t("marketplace.todaysPicks") : categoryLabel(t, category);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex flex-col min-[900px]:flex-row items-start">
        <aside className="w-full min-[900px]:w-[360px] min-[900px]:sticky min-[900px]:top-14 min-[900px]:h-[calc(100vh-56px)] overflow-y-auto scrollbar-none bg-hx-card shadow-hx p-4 flex flex-col gap-3 flex-shrink-0">
          <h1 className="text-2xl font-bold">{t("nav.marketplace")}</h1>
          <div className="h-10 rounded-[20px] bg-hx-input flex items-center gap-2 px-3 text-hx-text2">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("marketplace.search")}
              aria-label={t("marketplace.search")}
              className="flex-1 min-w-0 border-0 outline-none bg-transparent text-hx-text text-[15px]"
            />
          </div>

          <div className="flex min-[900px]:flex-col gap-1">
            <button onClick={() => setMine(false)} className={navRow(!mine)}>
              <span className={iconCircle(!mine)}>
                <Icon name="store" size={18} />
              </span>
              {t("marketplace.browseAll")}
            </button>
            <button onClick={() => setMine(true)} className={navRow(mine)}>
              <span className={iconCircle(mine)}>
                <Icon name="tag" size={18} />
              </span>
              {t("marketplace.yourListings")}
            </button>
          </div>

          <button onClick={() => setCreating(true)} className="hx-btn w-full bg-hx-accent-soft text-hx-accent hover:brightness-95">
            <Icon name="plus" size={18} sw={2.4} />
            {t("marketplace.createListing")}
          </button>

          <div className="h-px bg-hx-border my-1" />

          <div className="text-[17px] font-semibold">{t("marketplace.price")}</div>
          <div className="flex items-center gap-2">
            <input
              value={price.min}
              onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value }))}
              type="number"
              min="0"
              placeholder={t("marketplace.min")}
              aria-label={t("marketplace.minPrice")}
              className={priceInput}
            />
            <span className="text-hx-text2">{t("marketplace.to")}</span>
            <input
              value={price.max}
              onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value }))}
              type="number"
              min="0"
              placeholder={t("marketplace.max")}
              aria-label={t("marketplace.maxPrice")}
              className={priceInput}
            />
          </div>

          <div className="h-px bg-hx-border my-1" />

          <div className="text-[17px] font-semibold">{t("marketplace.categoriesTitle")}</div>
          <div className="flex min-[900px]:flex-col gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
            {[{ label: "All", icon: "grid" }, ...CATEGORIES].map((c) => {
              const active = category === c.label;
              return (
                <button key={c.label} onClick={() => setCategory(c.label)} className={`${navRow(active)} flex-shrink-0 min-[900px]:flex-shrink`}>
                  <span className={iconCircle(active)}>
                    <Icon name={c.icon} size={18} />
                  </span>
                  <span className="whitespace-nowrap">{c.label === "All" ? t("marketplace.allCategories") : categoryLabel(t, c.label)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0 w-full p-4 min-[600px]:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            {!loading && <span className="text-[13px] text-hx-text2">{t("marketplace.listingsCount", { count: items.length })}</span>}
          </div>
          {loading ? (
            <Loader />
          ) : items.length === 0 ? (
            <div className="card p-10 text-center text-hx-text2">
              {mine ? t("marketplace.noOwnListings") : t("marketplace.noResults")}
            </div>
          ) : (
            <div className="grid gap-x-3 gap-y-5 grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))]">
              {items.map((item) => (
                <ItemCard key={item._id} item={item} onOpen={() => openItem(item._id)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {openId && (
        <ItemModal
          itemId={openId}
          onClose={() => openItem(null)}
          onChanged={replaceItem}
          onDeleted={(id) => setItems((prev) => prev.filter((x) => x._id !== id))}
        />
      )}
      {creating && (
        <CreateListingModal
          onClose={() => setCreating(false)}
          onCreated={(item) => {
            setCreating(false);
            setItems((prev) => [item, ...prev]);
            openItem(item._id);
          }}
        />
      )}
    </div>
  );
}
