import { Link } from "react-router-dom";
import { PLATFORM_LABELS } from "@socialhub/contracts";
import { stampFor } from "../format.js";
import { BrandChip, NetworkIcon, Thumb } from "./ui.jsx";

export function DueSlip({ post, empty }) {
  if (!post) {
    return (
      <article className="slip slip-empty">
        <div className="slip-date" aria-hidden="true">
          <span className="slip-day">—</span>
        </div>
        <div className="slip-body">
          <h2>Nothing is scheduled</h2>
          <p className="meta">{empty || "Schedule a post and it will sit here until its slot."}</p>
          <Link className="btn small" to="/posts/new">
            Schedule a post
          </Link>
        </div>
      </article>
    );
  }
  const stamp = stampFor(post);
  const date = new Date(post.scheduledAt || post.publishedAt);
  return (
    <article className="slip" aria-label="Next slot">
      <div className="slip-date">
        <span className="slip-weekday">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
        <span className="slip-day">{date.getDate()}</span>
        <span className="slip-month">{date.toLocaleDateString("en-GB", { month: "short" })}</span>
        <span className="slip-when">{date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="slip-body">
        <h2>{post.title}</h2>
        {post.body ? <p className="slip-caption">{post.body}</p> : null}
        <ul className="slip-nets">
          <li>
            <BrandChip name={post.brandName} />
          </li>
          {(post.targets || []).map((target) => (
            <li key={target.id}>
              <NetworkIcon platform={target.platform} />
              {PLATFORM_LABELS[target.platform]}
              {target.handle ? <span className="net-handle">@{target.handle}</span> : null}
            </li>
          ))}
          {!(post.targets || []).length ? <li>No network selected</li> : null}
        </ul>
        <div className="slip-foot">
          <p className={`stamp tone-${stamp.tone}`}>
            <span>{stamp.word}</span>
            {stamp.note ? <span className="stamp-note">{stamp.note}</span> : null}
          </p>
          <Link className="btn" to={`/posts/${post.id}`}>
            Open post
          </Link>
        </div>
      </div>
      {post.media?.length ? (
        <div className="slip-media">
          <Thumb media={post.media} format={post.format} />
          {post.media.length > 1 ? <span className="slip-count">{post.media.length} files</span> : null}
        </div>
      ) : null}
    </article>
  );
}
