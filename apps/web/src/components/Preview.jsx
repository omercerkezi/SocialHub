import { useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, Repeat2, Send, Share2, ThumbsUp } from "lucide-react";
import { LIMITS, PLATFORM_LABELS } from "@socialhub/contracts";
import { fileUrl } from "../api.js";
import { BrandAvatar, NetworkIcon } from "./ui.jsx";

const ACTIONS = {
  facebook: [ThumbsUp, MessageCircle, Share2],
  instagram: [Heart, MessageCircle, Send, Bookmark],
  linkedin: [ThumbsUp, MessageCircle, Repeat2, Send],
  tiktok: [Heart, MessageCircle, Bookmark, Share2],
};

export function Preview({ platform, format, body, media, handle, name }) {
  const [index, setIndex] = useState(0);
  const rules = LIMITS[platform];
  const caption = body || "";
  const over = caption.length > rules.caption;
  const safeIndex = media.length ? index % media.length : 0;
  const current = media[safeIndex];
  const tall = format === "reel" || platform === "tiktok";
  const label = PLATFORM_LABELS[platform];
  const share = Math.min(100, (caption.length / rules.caption) * 100);
  return (
    <article className={`frame frame-${platform}${tall ? " frame-tall" : ""}`}>
      <header className="frame-strip">
        <NetworkIcon platform={platform} />
        <h3>{label}</h3>
        <p>Preview only. Not sent to {label}.</p>
      </header>
      <div className="frame-author">
        <BrandAvatar name={name || handle || label} size="sm" />
        <div>
          <p className="frame-name">{name || "Your brand"}</p>
          <p className="meta">{handle ? `@${handle}` : "No handle"} · Preview</p>
        </div>
      </div>
      {format === "text" ? null : (
        <div className={tall ? "frame-stage tall" : "frame-stage"}>
          {current?.kind === "image" ? <img src={fileUrl(current.id)} alt={current.altText || ""} /> : null}
          {current?.kind === "video" ? <video src={fileUrl(current.id)} controls /> : null}
          {!current ? <p className="meta">Add a file to see it in this frame.</p> : null}
          {media.length > 1 ? (
            <>
              <button type="button" className="frame-arrow prev" onClick={() => setIndex((value) => (value - 1 + media.length) % media.length)}>
                <ChevronLeft size={18} aria-hidden="true" />
                <span className="sr-only">Previous file</span>
              </button>
              <button type="button" className="frame-arrow next" onClick={() => setIndex((value) => (value + 1) % media.length)}>
                <ChevronRight size={18} aria-hidden="true" />
                <span className="sr-only">Next file</span>
              </button>
              <span className="frame-pos" aria-live="polite">
                {safeIndex + 1} of {media.length}
              </span>
            </>
          ) : null}
        </div>
      )}
      {media.length > 1 ? (
        <div className="frame-dots" aria-hidden="true">
          {media.map((item, dot) => (
            <span key={item.id} className={dot === safeIndex ? "on" : ""} />
          ))}
        </div>
      ) : null}
      <div className="frame-actions" aria-hidden="true">
        {(ACTIONS[platform] || []).map((Icon, slot) => (
          <Icon key={slot} size={18} />
        ))}
      </div>
      <p className="frame-caption">{caption || <span className="meta">No caption yet.</span>}</p>
      <div className="frame-limit">
        <span className={over ? "limit-track over" : "limit-track"} aria-hidden="true">
          <span style={{ width: `${share}%` }} />
        </span>
        <p className={over ? "form-error" : "meta"}>
          {caption.length.toLocaleString("en-GB")} / {rules.caption.toLocaleString("en-GB")} characters
        </p>
      </div>
    </article>
  );
}
