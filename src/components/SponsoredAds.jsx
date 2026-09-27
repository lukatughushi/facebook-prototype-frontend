import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

// Demo ads - fictitious brands, not wired to any ad backend. Images come from
// the same product CDN as the seeded Marketplace; "Learn more" opens the
// matching Marketplace category.
const IMG = "https://cdn.dummyjson.com/product-images";
export const ADS = [
  { id: "sofa", domain: "loftandlinen.co", image: `${IMG}/furniture/annibale-colombo-sofa/1.webp`, category: "Furniture", tint: "#b45309" },
  { id: "bedside", domain: "grainhouse.store", image: `${IMG}/furniture/bedside-table-african-cherry/1.webp`, category: "Furniture", tint: "#7c2d12" },
  { id: "chair", domain: "sitwell.office", image: `${IMG}/furniture/knoll-saarinen-executive-conference-chair/1.webp`, category: "Furniture", tint: "#1e3a8a" },
  { id: "sink", domain: "basinandtap.com", image: `${IMG}/furniture/wooden-bathroom-sink-with-mirror/1.webp`, category: "Furniture", tint: "#0f766e" },
  { id: "swing", domain: "porchlight.home", image: `${IMG}/home-decoration/decoration-swing/1.webp`, category: "Furniture", tint: "#a16207" },
  { id: "frame", domain: "framedtogether.co", image: `${IMG}/home-decoration/family-tree-photo-frame/1.webp`, category: "Hobbies", tint: "#9d174d" },
  { id: "hoops", domain: "fullcourt.gear", image: `${IMG}/sports-accessories/basketball/1.webp`, category: "Hobbies", tint: "#c2410c" },
  { id: "glove", domain: "diamondside.shop", image: `${IMG}/sports-accessories/baseball-glove/1.webp`, category: "Hobbies", tint: "#78350f" },
  { id: "shirt", domain: "northweave.co", image: `${IMG}/mens-shirts/blue-&-black-check-shirt/1.webp`, category: "Apparel", tint: "#1d4ed8" },
  { id: "bag", domain: "carryall.studio", image: `${IMG}/womens-bags/blue-women's-handbag/1.webp`, category: "Apparel", tint: "#1e40af" },
  { id: "shades", domain: "brightside.eyewear", image: `${IMG}/sunglasses/black-sun-glasses/1.webp`, category: "Apparel", tint: "#111827" },
  { id: "watch", domain: "tickandtan.com", image: `${IMG}/mens-watches/brown-leather-belt-watch/1.webp`, category: "Apparel", tint: "#92400e" },
];

const PER_VIEW = 2;
const ROTATE_MS = 15000;

function AdImage({ ad }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="w-[120px] h-[120px] flex-shrink-0 rounded-lg overflow-hidden bg-white"
      style={failed ? { background: `linear-gradient(135deg, ${ad.tint}, color-mix(in oklab, ${ad.tint} 40%, white))` } : undefined}
    >
      {!failed && (
        <img src={ad.image} alt="" loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-contain p-1.5" />
      )}
    </div>
  );
}

// "Sponsored" block for the right column: two ads at a time, rotating
// through the list every ROTATE_MS (paused while hovered).
export default function SponsoredAds() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [start, setStart] = useState(() => Math.floor(Math.random() * ADS.length));
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;
    const t = setInterval(() => setStart((s) => (s + PER_VIEW) % ADS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [hovered]);

  const visible = Array.from({ length: PER_VIEW }, (_, i) => ADS[(start + i) % ADS.length]);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {visible.map((ad) => (
        <div key={ad.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-hx-hover animate-hx-fade">
          <AdImage ad={ad} />
          <div className="min-w-0 flex flex-col gap-1.5">
            <div className="font-medium leading-snug">{t(`ads.${ad.id}`)}</div>
            <div className="text-[13px] text-hx-text2 truncate">{ad.domain}</div>
            <button
              onClick={() => navigate(`/marketplace?category=${encodeURIComponent(ad.category)}`)}
              className="hx-btn self-start h-8 px-3 text-[13px] bg-hx-btn text-hx-text hover:bg-hx-btnh"
            >
              {t("sidebar.learnMore")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
