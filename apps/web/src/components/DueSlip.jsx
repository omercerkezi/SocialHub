import { Link } from "react-router-dom";
import { networks, stampFor, when } from "../format.js";

export function DueSlip({ post, empty }) {
  if (!post) {
    return (
      <article className="slip slip-empty">
        <h2>Nothing is scheduled</h2>
        <p>{empty || "Schedule a post and it will sit here until its slot."}</p>
      </article>
    );
  }
  const stamp = stampFor(post);
  return (
    <article className="slip">
      <p className="slip-brand">{post.brandName}</p>
      <h2>{post.title}</h2>
      <p className="slip-when">{when(post.scheduledAt || post.publishedAt)}</p>
      <p>{networks(post) || "No network selected"}</p>
      <p className={`stamp tone-${stamp.tone}`}>
        <span>{stamp.word}</span>
        {stamp.note ? <span className="stamp-note">{stamp.note}</span> : null}
      </p>
      <Link to={`/posts/${post.id}`}>Open post</Link>
    </article>
  );
}
