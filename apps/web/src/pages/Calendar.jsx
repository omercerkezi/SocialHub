import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "../api.js";
import { BrandChip, EmptyState, ErrorNote, NetworkStack, StatusBadge, Thumb, statusTone } from "../components/ui.jsx";
import { dayKey, stampFor, startOfWeek } from "../format.js";
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

  const unit = view === "month" ? "month" : view === "week" ? "week" : "day";

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Calendar
          </h1>
          <p className="finding">
            {posts.length} {posts.length === 1 ? "post" : "posts"} dated in this view. Scheduled slots are simulated when they come due.
          </p>
        </div>
        <Link className="btn primary" to="/posts/new">
          <Plus size={16} aria-hidden="true" />
          New post
        </Link>
      </div>
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="icon-button" onClick={() => shift(-1)}>
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="sr-only">Previous {unit}</span>
          </button>
          <button type="button" className="btn" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button type="button" className="icon-button" onClick={() => shift(1)}>
            <ChevronRight size={18} aria-hidden="true" />
            <span className="sr-only">Next {unit}</span>
          </button>
          <h2 className="cal-range" aria-live="polite">
            {range.label}
          </h2>
        </div>
        <div className="segmented" role="group" aria-label="Calendar view">
          {["day", "week", "month"].map((item) => (
            <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {view === "month" ? <Month cursor={cursor} posts={posts} onPick={setCursor} onOpenDay={() => setView("day")} /> : null}
      {view === "week" ? <Week cursor={cursor} posts={posts} onPick={setCursor} onOpenDay={() => setView("day")} /> : null}
      {view === "day" ? <Day cursor={cursor} posts={posts} /> : null}
    </div>
  );
}

function stampDate(post) {
  return new Date(post.scheduledAt || post.publishedAt);
}

function time(post) {
  return stampDate(post).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function onDay(posts, key) {
  return posts.filter((post) => dayKey(post.scheduledAt || post.publishedAt) === key).sort((a, b) => stampDate(a) - stampDate(b));
}

function Month({ cursor, posts, onPick, onOpenDay }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const todayKey = dayKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  function open(date) {
    onPick(date);
    onOpenDay();
  }
  return (
    <div className="month">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
        <p key={label} className="month-label">
          {label}
        </p>
      ))}
      {days.map((date) => {
        const key = dayKey(date);
        const items = onDay(posts, key);
        const outside = date.getMonth() !== cursor.getMonth();
        const classes = ["day-cell", outside ? "outside" : "", key === todayKey ? "today" : ""].filter(Boolean).join(" ");
        return (
          <div key={key} className={classes}>
            <button type="button" className="day-number" onClick={() => open(date)} aria-current={key === todayKey ? "date" : undefined}>
              <span>{date.getDate()}</span>
              <span className="sr-only"> {date.toLocaleDateString("en-GB", { month: "long" })}, open day</span>
            </button>
            {items.slice(0, 3).map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className={`chip-event tone-${statusTone(post)}`}>
                <span className="badge-dot" aria-hidden="true" />
                <span className="chip-time num">{time(post)}</span>
                <span className="chip-title">{post.title}</span>
                <span className="sr-only">, {stampFor(post).word}</span>
              </Link>
            ))}
            {items.length > 3 ? (
              <button type="button" className="more" onClick={() => open(date)}>
                {items.length - 3} more
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Week({ cursor, posts, onPick, onOpenDay }) {
  const start = startOfWeek(cursor);
  const todayKey = dayKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return (
    <div className="week">
      {days.map((date) => {
        const key = dayKey(date);
        const items = onDay(posts, key);
        return (
          <section key={key} className={key === todayKey ? "week-day-col today" : "week-day-col"}>
            <h2 className="week-head">
              <button
                type="button"
                onClick={() => {
                  onPick(date);
                  onOpenDay();
                }}
                aria-current={key === todayKey ? "date" : undefined}
              >
                <span className="week-head-name">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                <span className="week-head-num">{date.getDate()}</span>
              </button>
            </h2>
            <div className="week-body">
              {items.length === 0 ? <p className="week-empty">No posts</p> : null}
              {items.map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className={`event tone-${statusTone(post)}`}>
                  <span className="event-time num">{time(post)}</span>
                  <strong className="event-title">{post.title}</strong>
                  <span className="event-meta">
                    <NetworkStack targets={post.targets} />
                    <span>{post.brandName}</span>
                  </span>
                  <span className="event-status">
                    <span className="badge-dot" aria-hidden="true" />
                    {stampFor(post).word}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Day({ cursor, posts }) {
  const items = onDay(posts, dayKey(cursor));
  if (!items.length) {
    return (
      <div className="panel">
        <EmptyState
          title="Nothing is dated on this day."
          action={
            <Link className="btn small" to="/posts/new">
              Schedule a post
            </Link>
          }
        />
      </div>
    );
  }
  return (
    <ol className="timeline">
      {items.map((post) => (
        <li key={post.id}>
          <span className="timeline-time num">{time(post)}</span>
          <Link to={`/posts/${post.id}`} className="timeline-card">
            <Thumb media={post.media} format={post.format} />
            <span className="timeline-main">
              <strong>{post.title}</strong>
              <span className="timeline-meta">
                <BrandChip name={post.brandName} />
                <NetworkStack targets={post.targets} />
              </span>
            </span>
            <StatusBadge post={post} />
          </Link>
        </li>
      ))}
    </ol>
  );
}

function rangeFor(view, cursor) {
  if (view === "month") {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
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
      label: `${from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    };
  }
  const from = new Date(cursor);
  from.setHours(0, 0, 0, 0);
  const to = new Date(cursor);
  to.setHours(23, 59, 59, 0);
  return { from, to, label: cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) };
}
