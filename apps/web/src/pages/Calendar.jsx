import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { dayKey, stampFor, startOfWeek, when } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Calendar() {
  const heading = usePage("Calendar");
  const { brandId } = useDesk();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  const range = useMemo(() => rangeFor(view, cursor), [view, cursor]);

  useEffect(() => {
    const params = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
    if (brandId) params.set("brandId", brandId);
    api(`/calendar?${params}`)
      .then(setPosts)
      .catch((err) => setError(err.message));
  }, [brandId, range.from, range.to]);

  function shift(direction) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCursor(next);
  }

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Calendar
          </h1>
          <p className="finding">{range.label}</p>
        </div>
        <Link className="btn primary" to="/posts/new">
          New post
        </Link>
      </div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Calendar view">
          {["day", "week", "month"].map((item) => (
            <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => shift(-1)}>
          Previous
        </button>
        <button type="button" className="btn" onClick={() => setCursor(new Date())}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => shift(1)}>
          Next
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {view === "month" ? <Month cursor={cursor} posts={posts} onPick={setCursor} onOpenDay={() => setView("day")} /> : null}
      {view === "week" ? <Week cursor={cursor} posts={posts} /> : null}
      {view === "day" ? <Day cursor={cursor} posts={posts} /> : null}
    </div>
  );
}

function Month({ cursor, posts, onPick, onOpenDay }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return (
    <div className="month">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
        <p key={label} className="meta month-label">
          {label}
        </p>
      ))}
      {days.map((date) => {
        const key = dayKey(date);
        const items = posts.filter((post) => dayKey(post.scheduledAt || post.publishedAt) === key);
        const outside = date.getMonth() !== cursor.getMonth();
        return (
          <div key={key} className={outside ? "day-cell outside" : "day-cell"}>
            <button
              type="button"
              className="day-number"
              onClick={() => {
                onPick(date);
                onOpenDay();
              }}
            >
              {date.getDate()}
              <span className="sr-only"> {date.toLocaleDateString("en-GB", { month: "long" })}</span>
            </button>
            {items.slice(0, 3).map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="mini-slip">
                {post.title}
                <span>{stampFor(post).word}</span>
              </Link>
            ))}
            {items.length > 3 ? <p className="meta">{items.length - 3} more</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function Week({ cursor, posts }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return (
    <div className="week">
      {days.map((date) => {
        const key = dayKey(date);
        const items = posts.filter((post) => dayKey(post.scheduledAt || post.publishedAt) === key);
        return (
          <section key={key}>
            <h2>{date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</h2>
            {items.length === 0 ? <p className="meta">Empty</p> : null}
            {items.map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="mini-slip">
                <strong>{post.title}</strong>
                <span>
                  {post.brandName} · {stampFor(post).word}
                </span>
              </Link>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Day({ cursor, posts }) {
  const key = dayKey(cursor);
  const items = posts
    .filter((post) => dayKey(post.scheduledAt || post.publishedAt) === key)
    .sort((a, b) => new Date(a.scheduledAt || a.publishedAt) - new Date(b.scheduledAt || b.publishedAt));
  if (!items.length) return <p className="meta">Nothing is dated on this day.</p>;
  return (
    <ul className="rows">
      {items.map((post) => (
        <li key={post.id}>
          <div>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <p className="meta">
              {post.brandName} · {when(post.scheduledAt || post.publishedAt)} · {stampFor(post).word}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function rangeFor(view, cursor) {
  if (view === "month") {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    const gridStart = startOfWeek(from);
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 41);
    gridEnd.setHours(23, 59, 59, 0);
    return {
      from: gridStart,
      to: gridEnd,
      label: cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    };
  }
  if (view === "week") {
    const from = startOfWeek(cursor);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 0);
    return {
      from,
      to,
      label: `${from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    };
  }
  const from = new Date(cursor);
  from.setHours(0, 0, 0, 0);
  const to = new Date(cursor);
  to.setHours(23, 59, 59, 0);
  return { from, to, label: cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) };
}
