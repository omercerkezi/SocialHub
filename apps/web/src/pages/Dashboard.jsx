import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { DueSlip } from "../components/DueSlip.jsx";
import { WeekChart } from "../components/WeekChart.jsx";
import { stampFor, when } from "../format.js";
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

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Today's run
          </h1>
          <p className="finding">{data?.finding || "Loading the desk."}</p>
        </div>
        <Link className="btn primary" to="/posts/new">
          New post
        </Link>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {data ? (
        <>
          <section className="counts" aria-label="Counts">
            <div>
              <p>Scheduled</p>
              <p className="figure">{data.counts.scheduled}</p>
              <p className="meta">Ahead, including the next slot</p>
            </div>
            <div>
              <p>Failed</p>
              <p className="figure">{data.counts.failed}</p>
              <p className="meta">Still waiting for a retry</p>
            </div>
            <div>
              <p>Simulated</p>
              <p className="figure">{data.counts.simulatedThisWeek}</p>
              <p className="meta">{data.counts.windowLabel}</p>
            </div>
          </section>
          <div className="desk">
            <div className="stack">
              <DueSlip post={data.next} />
              <WeekChart week={data.week} total={data.weekTotal} windowLabel={data.counts.windowLabel} />
              <section className="panel">
                <header className="panel-head">
                  <h2>After the next slot</h2>
                  <Link to="/calendar">View calendar</Link>
                </header>
                <PostRows posts={data.afterNext} empty="Nothing else is scheduled." />
              </section>
            </div>
            <aside className="rail">
              <section className="panel">
                <header className="panel-head">
                  <h2>Failed</h2>
                  <Link to="/history">View history</Link>
                </header>
                <PostRows posts={data.failed} empty="No failed simulations are waiting." action="Retry" />
              </section>
              <section className="panel">
                <header className="panel-head">
                  <h2>Simulated recently</h2>
                </header>
                <PostRows posts={data.recent} empty="Nothing has been simulated yet." />
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PostRows({ posts, empty, action }) {
  if (!posts.length) return <p className="meta">{empty}</p>;
  return (
    <ul className="rows">
      {posts.map((post) => {
        const stamp = stampFor(post);
        return (
          <li key={post.id}>
            <div>
              <Link to={`/posts/${post.id}`}>{post.title}</Link>
              <p className="meta">
                {post.brandName} · {when(post.scheduledAt || post.publishedAt)} · {stamp.word}
              </p>
            </div>
            {action && (post.status === "failed" || post.status === "partial") ? (
              <Link to={`/posts/${post.id}`}>{action}</Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
