import { useState } from "react";
import { LIMITS, PLATFORM_LABELS } from "@socialhub/contracts";
import { fileUrl } from "../api.js";

export function Preview({ platform, format, body, media }) {
  const [index, setIndex] = useState(0);
  const rules = LIMITS[platform];
  const caption = body || "";
  const over = caption.length > rules.caption;
  const current = media[index];
  const tall = format === "reel" || platform === "tiktok";
  return (
    <article className={tall ? "frame frame-tall" : "frame"}>
      <header>
        <h3>{PLATFORM_LABELS[platform]}</h3>
        <p>Preview only. Not sent to {PLATFORM_LABELS[platform]}.</p>
      </header>
      <div className={tall ? "frame-stage tall" : "frame-stage"}>
        {current?.kind === "image" ? <img src={fileUrl(current.id)} alt={current.altText || ""} /> : null}
        {current?.kind === "video" ? <video src={fileUrl(current.id)} controls /> : null}
        {!current && format !== "text" ? <p className="meta">Add a file to see it in this frame.</p> : null}
        {format === "text" ? <p className="meta">Text only. No file in this frame.</p> : null}
      </div>
      {media.length > 1 ? (
        <div className="frame-nav">
          <button type="button" onClick={() => setIndex((value) => (value - 1 + media.length) % media.length)}>
            Previous file
          </button>
          <span>
            {index + 1} of {media.length}
          </span>
          <button type="button" onClick={() => setIndex((value) => (value + 1) % media.length)}>
            Next file
          </button>
        </div>
      ) : null}
      <p className="frame-caption">{caption || "No caption yet."}</p>
      <p className={over ? "form-error" : "meta"}>
        {caption.length.toLocaleString("en-GB")} / {rules.caption.toLocaleString("en-GB")} characters
      </p>
    </article>
  );
}
