import { useNavigate } from "react-router-dom";
import Avatar from "../Avatar";
import resolveImage from "../../utils/resolveImage";
import { colorFor } from "../../utils/format";

// Grid card for the Groups / Pages browse screens: cover strip, optional
// avatar (pages), name, meta line and one action button.
export default function EntityCard({ to, name, coverImage, avatar, meta, action }) {
  const navigate = useNavigate();
  return (
    <div className="card overflow-hidden flex flex-col animate-hx-fade">
      <div
        onClick={() => navigate(to)}
        className="relative h-[120px] bg-hx-input cursor-pointer"
        style={coverImage ? undefined : { background: `linear-gradient(135deg, ${colorFor(name)}, rgb(var(--input)))` }}
      >
        {coverImage && <img src={resolveImage(coverImage)} alt="" loading="lazy" className="w-full h-full object-cover" />}
        {avatar !== undefined && (
          <div className="absolute left-3 -bottom-6 rounded-full border-4 border-hx-card">
            <Avatar src={avatar} name={name} size={56} />
          </div>
        )}
      </div>
      <div className={`flex-1 flex flex-col gap-1 px-3 pb-3 ${avatar !== undefined ? "pt-8" : "pt-3"}`}>
        <div onClick={() => navigate(to)} className="font-semibold text-[17px] leading-tight cursor-pointer hover:underline">
          {name}
        </div>
        <div className="text-[13px] text-hx-text2 flex items-center gap-1">{meta}</div>
        <div className="mt-auto pt-2">{action}</div>
      </div>
    </div>
  );
}
