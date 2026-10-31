import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { BrandChip, EmptyState, ErrorNote, NetworkBadge, SkeletonRows } from "../components/ui.jsx";
import { when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function History() {
  const heading = usePage("History");
  const { brandId } = useDesk();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = brandId ? `?brandId=${brandId}` : "";
    setRows(null);
    api(`/history${query}`)
      .then(setRows)
      .catch((err) => {
        setError(err.message);
        setRows([]);
      });
  }, [brandId]);

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            History
          </h1>
          <p className="finding">Each attempt says whether it was simulated. A simulated success was not sent.</p>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <section className="panel flush">
        {rows === null ? (
          <SkeletonRows rows={6} label="Loading history" />
        ) : rows.length === 0 ? (
          <EmptyState title="No attempts yet.">Run a simulation from a post and its result lands here.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Post</th>
                  <th scope="col">Network</th>
                  <th scope="col">Result</th>
                  <th scope="col">What happened</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tone = row.outcome !== "succeeded" ? "failed" : row.simulated ? "simulated" : "live";
                  return (
                    <tr key={row.id}>
                      <td className="nowrap num">{when(row.finishedAt)}</td>
                      <td>
                        <Link className="row-title" to={`/posts/${row.postId}`}>
                          {row.title}
                        </Link>
                        <div className="cell-sub">
                          <BrandChip name={row.brandName} />
                        </div>
                      </td>
                      <td>
                        <NetworkBadge platform={row.platform} />
                      </td>
                      <td>
                        <span className={`badge badge-${tone}`}>
                          <span className="badge-dot" aria-hidden="true" />
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="cell-wide">
                        {row.summary}
                        {row.externalPostId ? <p className="meta mono">{row.externalPostId}</p> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
