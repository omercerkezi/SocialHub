import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { DueSlip } from "../components/DueSlip.jsx";
import { WeekChart } from "../components/WeekChart.jsx";
import { BrandChip, EmptyState, ErrorNote, NetworkStack, SkeletonRows, StatusBadge, Thumb } from "../components/ui.jsx";
import { when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Dashboard() {
  const heading = usePage("Today's run");
  const { brandId } = useDesk();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = brandId ? `?brandId=${brandId}` : "";
    api(`/dashboard${query}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [brandId]);

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Today's run
          </h1>
          <p className="finding">
            <span className="finding-date">{today}</span>
            {data?.finding || "Loading the desk."}
          </p>
        </div>
        <Link className="btn primary" to="/posts/new">
          <Plus size={16} aria-hidden="true" />
          New post
        </Link>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {data ? (
        <>
          <section className="kpis" aria-label="Counts">
            <Kpi to="/posts?status=scheduled" label="Scheduled" value={data.counts.scheduled} note="Ahead, including the next slot" tone="scheduled" />
            <Kpi
              to="/posts?status=failed"
              label="Failed"
              value={data.counts.failed}
              note={data.counts.failed ? "Still waiting for a retry" : "Nothing waiting"}
              tone={data.counts.failed ? "failed" : "quiet"}
            />
            <Kpi to="/history" label="Simulated" value={data.counts.simulatedThisWeek} note={data.counts.windowLabel} tone="simulated" />
            <Kpi to="/calendar" label="Slots this week" value={data.weekTotal} note="Dated posts, any result" tone="quiet" />
          </section>
          <div className="desk">
            <div className="stack">
              <DueSlip post={data.next} />
              <WeekChart week={data.week} total={data.weekTotal} windowLabel={data.counts.windowLabel} />
              <section className="panel">
                <header className="panel-head">
                  <h2>After the next slot</h2>
                  <Link className="panel-link" to="/calendar">
                    View calendar
                  </Link>
                </header>
                <PostRows posts={data.afterNext} empty="Nothing else is scheduled." />
              </section>
            </div>
            <aside className="rail">
              <section className={data.failed.length ? "panel panel-alert" : "panel"}>
                <header className="panel-head">
                  <h2>Needs a retry</h2>
                  <Link className="panel-link" to="/history">
                    View history
                  </Link>
                </header>
                <PostRows posts={data.failed} empty="No failed simulations are waiting." action="Retry" compact />
              </section>
              <section className="panel">
                <header className="panel-head">
                  <h2>Simulated recently</h2>
                </header>
                <PostRows posts={data.recent} empty="Nothing has been simulated yet." compact />
              </section>
            </aside>
          </div>
        </>
      ) : error ? null : (
        <div className="desk">
          <div className="stack">
            <div className="panel">
              <SkeletonRows rows={3} label="Loading the desk" />
            </div>
          </div>
          <aside className="rail">
            <div className="panel">
              <SkeletonRows rows={3} label="Loading results" />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Kpi({ to, label, value, note, tone }) {
  return (
    <Link className={`kpi kpi-${tone}`} to={to}>
      <span className="kpi-label">
        <span className="badge-dot" aria-hidden="true" />
        {label}
      </span>
      <span className="figure">{value}</span>
      <span className="meta">{note}</span>
    </Link>
  );
}

function PostRows({ posts, empty, action, compact }) {
  if (!posts.length) return <EmptyState title={empty} />;
  return (
    <ul className={compact ? "post-rows compact" : "post-rows"}>
      {posts.map((post) => (
        <li key={post.id}>
          {compact ? null : <Thumb media={post.media} format={post.format} />}
          <div className="post-rows-main">
            <Link className="row-title" to={`/posts/${post.id}`}>
              {post.title}
            </Link>
            <p className="meta">
              {compact ? `${post.brandName} · ` : null}
              <span className="num">{when(post.scheduledAt || post.publishedAt)}</span>
            </p>
          </div>
          {compact ? null : <BrandChip name={post.brandName} />}
          <NetworkStack targets={post.targets} />
          {action && (post.status === "failed" || post.status === "partial") ? (
            <Link className="btn small" to={`/posts/${post.id}`}>
              {action}
            </Link>
          ) : (
            <StatusBadge post={post} />
          )}
        </li>
      ))}
    </ul>
  );
}
