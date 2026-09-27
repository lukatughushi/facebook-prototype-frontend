import { useNavigate } from "react-router-dom";
import Avatar from "../Avatar";
import resolveImage from "../../utils/resolveImage";
import { colorFor } from "../../utils/format";

// Cover + title block shared by the Group and Page views, laid out like the
// profile header: cover photo, optional overlapping avatar (pages), name,
// subtitle line, a stack of member/follower faces and the action buttons.
export default function EntityHero({ name, coverImage, avatar, subtitle, people = [], actions, extraActions, onViewCover }) {
  const navigate = useNavigate();
  return (
    <div className="bg-hx-card shadow-hx animate-[hxFade_.25s_ease]">
      <div className="max-w-[1100px] mx-auto">
        <div
          className="relative h-[max(160px,30vw)] min-[1100px]:h-[350px] rounded-b-lg overflow-hidden bg-hx-input"
          style={coverImage ? undefined : { background: `linear-gradient(135deg, ${colorFor(name)}, rgb(var(--input)))` }}
        >
          {coverImage && (
            <img src={resolveImage(coverImage)} alt="" onClick={onViewCover} className="w-full h-full object-cover cursor-zoom-in" />
          )}
        </div>

        <div
          className={`flex flex-col items-center text-center min-[900px]:flex-row min-[900px]:items-end min-[900px]:text-left gap-4 px-8 pb-4 ${
            avatar !== undefined ? "" : "pt-4"
          }`}
        >
          {avatar !== undefined && (
            <div className="relative flex-shrink-0 w-[140px] h-[140px] -mt-[70px] min-[600px]:w-[168px] min-[600px]:h-[168px] min-[600px]:-mt-[84px]">
              <div className="w-full h-full rounded-full border-4 border-hx-card overflow-hidden" style={{ background: colorFor(name) }}>
                <Avatar src={avatar} name={name} size={168} style={{ width: "100%", height: "100%", fontSize: 56 }} />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 pb-2">
            <div className="text-[32px] font-bold leading-[1.2] break-words">{name}</div>
            <div className="text-[15px] font-semibold text-hx-text2 mt-1 flex items-center justify-center min-[900px]:justify-start gap-1.5 flex-wrap">
              {subtitle}
            </div>
            {people.length > 0 && (
              <div className="flex justify-center min-[900px]:justify-start pl-1.5 mt-2">
                {people.slice(0, 10).map((p) => (
                  <div
                    key={p._id}
                    title={p.name}
                    onClick={() => navigate(`/profile/${p._id}`)}
                    className="-ml-1.5 rounded-full border-2 border-hx-card cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <Avatar src={p.avatar} name={p.name} size={28} style={{ fontSize: 11 }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex gap-2 flex-wrap justify-center pb-2">
            {actions}
            {extraActions}
          </div>
        </div>
      </div>
    </div>
  );
}
