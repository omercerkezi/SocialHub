import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { FORMAT_LABELS, stampFor, when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Posts() {
  const heading = usePage("Posts");
  const { brandId } = useDesk();
  const [status, setStatus] = useState("");
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (status) params.set("status", status);
    api(`/posts?${params}`)
      .then(setPosts)
      .catch((err) => setError(err.message));
  }, [brandId, status]);

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Posts
          </h1>
          <p className="finding">Drafts, scheduled slots, and simulated results.</p>
        </div>
        <Link className="btn primary" to="/posts/new">
          New post
        </Link>
      </div>
      <label className="field inline">
        <span>Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Any status</option>
          {["draft", "scheduled", "published", "failed", "partial", "cancelled"].map((item) => (
            <option key={item} value={item}>
              {item[0].toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <table className="sheet">
        <thead>
          <tr>
            <th>Post</th>
            <th>Brand</th>
            <th>Format</th>
            <th>When</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                <Link to={`/posts/${post.id}`}>{post.title}</Link>
                {post.collectionName ? <p className="meta">{post.collectionName}</p> : null}
              </td>
              <td>{post.brandName}</td>
              <td>{FORMAT_LABELS[post.format]}</td>
              <td className="num">{post.scheduledAt || post.publishedAt ? when(post.scheduledAt || post.publishedAt) : "—"}</td>
              <td>{stampFor(post).word}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {posts.length === 0 ? <p className="meta">No posts in this filter.</p> : null}
    </div>
  );
}
