import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { BrandChip, EmptyState, ErrorNote, NetworkStack, SkeletonRows, StatusBadge, Thumb } from "../components/ui.jsx";
import { FORMAT_LABELS, when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

const FILTERS = [
  ["", "All"],
  ["draft", "Drafts"],
  ["scheduled", "Scheduled"],
  ["published", "Succeeded"],
  ["failed", "Failed"],
  ["partial", "Partial"],
  ["cancelled", "Cancelled"],
];

export function Posts() {
  const heading = usePage("Posts");
  const { brandId } = useDesk();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams();
    if (brandId) query.set("brandId", brandId);
    if (status) query.set("status", status);
    setPosts(null);
    api(`/posts?${query}`)
      .then(setPosts)
      .catch((err) => {
        setError(err.message);
        setPosts([]);
      });
  }, [brandId, status]);

  function choose(value) {
    if (value) setParams({ status: value });
    else setParams({});
  }

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Posts
          </h1>
          <p className="finding">Drafts, scheduled slots, and simulated results.</p>
        </div>
        <Link className="btn primary" to="/posts/new">
          <Plus size={16} aria-hidden="true" />
          New post
        </Link>
      </div>
      <div className="tabs" role="group" aria-label="Filter by status">
        {FILTERS.map(([value, label]) => (
          <button key={value || "all"} type="button" aria-pressed={status === value} onClick={() => choose(value)}>
            {label}
          </button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      <section className="panel flush">
        {posts === null ? (
          <SkeletonRows rows={6} label="Loading posts" />
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts in this filter."
            action={
              <Link className="btn small" to="/posts/new">
                Write a post
              </Link>
            }
          >
            Change the status filter or the brand you are working in.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th scope="col">Post</th>
                  <th scope="col">Brand</th>
                  <th scope="col">Networks</th>
                  <th scope="col">Format</th>
                  <th scope="col" className="num">
                    When
                  </th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="cell-post">
                        <Thumb media={post.media} format={post.format} />
                        <div>
                          <Link className="row-title" to={`/posts/${post.id}`}>
                            {post.title}
                          </Link>
                          {post.collectionName ? <p className="meta">{post.collectionName}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <BrandChip name={post.brandName} />
                    </td>
                    <td>
                      <NetworkStack targets={post.targets} />
                    </td>
                    <td>{FORMAT_LABELS[post.format]}</td>
                    <td className="num">{post.scheduledAt || post.publishedAt ? when(post.scheduledAt || post.publishedAt) : "—"}</td>
                    <td>
                      <StatusBadge post={post} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
