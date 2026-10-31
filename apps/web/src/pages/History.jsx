import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PLATFORM_LABELS } from "@socialhub/contracts";
import { api } from "../api.js";
import { when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function History() {
  const heading = usePage("History");
  const { brandId } = useDesk();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = brandId ? `?brandId=${brandId}` : "";
    api(`/history${query}`)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [brandId]);

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            History
          </h1>
          <p className="finding">Each attempt says whether it was simulated. A simulated success was not sent.</p>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <table className="sheet">
        <thead>
          <tr>
            <th>When</th>
            <th>Post</th>
            <th>Network</th>
            <th>Result</th>
            <th>What happened</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="num">{when(row.finishedAt)}</td>
              <td>
                <Link to={`/posts/${row.postId}`}>{row.title}</Link>
                <p className="meta">{row.brandName}</p>
              </td>
              <td>{PLATFORM_LABELS[row.platform]}</td>
              <td>{row.statusLabel}</td>
              <td>
                {row.summary}
                {row.externalPostId ? <p className="meta">{row.externalPostId}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="meta">No attempts yet.</p> : null}
    </div>
  );
}
