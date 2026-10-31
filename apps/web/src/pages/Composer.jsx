import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Check, Copy, Film } from "lucide-react";
import { LIMITS, validateComposition } from "@socialhub/contracts";
import { api, fileUrl } from "../api.js";
import { Preview } from "../components/Preview.jsx";
import { EmptyState, NetworkIcon, StatusBadge } from "../components/ui.jsx";
import { FORMAT_LABELS, PLATFORM_LABELS, stampFor } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

const EMPTY = {
  brandId: "",
  collectionId: "",
  title: "",
  body: "",
  format: "image",
  mediaIds: [],
  accountIds: [],
};

export function Composer() {
  const { id } = useParams();
  const heading = usePage(id ? "Edit post" : "New post");
  const navigate = useNavigate();
  const { brandId: scopedBrand, brands } = useDesk();
  const [form, setForm] = useState({ ...EMPTY, brandId: scopedBrand || "" });
  const [post, setPost] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [media, setMedia] = useState([]);
  const [sets, setSets] = useState([]);
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!form.brandId) {
      setAccounts([]);
      setMedia([]);
      setSets([]);
      return;
    }
    Promise.all([
      api(`/accounts?brandId=${form.brandId}`),
      api(`/media?brandId=${form.brandId}`),
      api(`/collections?brandId=${form.brandId}`),
    ]).then(([accountRows, mediaRows, setRows]) => {
      setAccounts(accountRows);
      setMedia(mediaRows);
      setSets(setRows);
    });
  }, [form.brandId]);

  useEffect(() => {
    if (!id) {
      setPost(null);
      setForm({ ...EMPTY, brandId: scopedBrand || "" });
      setWhen("");
      setNotice("");
      setError("");
      return;
    }
    api(`/posts/${id}`).then((loaded) => {
      setPost(loaded);
      setForm({
        brandId: loaded.brandId,
        collectionId: loaded.collectionId || "",
        title: loaded.title,
        body: loaded.body,
        format: loaded.format,
        mediaIds: loaded.media.map((item) => item.id),
        accountIds: loaded.targets.map((target) => target.accountId),
      });
      if (loaded.scheduledAt) setWhen(toLocal(loaded.scheduledAt));
    });
  }, [id]);

  const selectedMedia = form.mediaIds.map((mediaId) => media.find((item) => item.id === mediaId)).filter(Boolean);
  const selectedAccounts = accounts.filter((account) => form.accountIds.includes(account.id));
  const issues = useMemo(() => {
    return selectedAccounts.flatMap((account) =>
      validateComposition({
        format: form.format,
        body: form.body,
        media: selectedMedia,
        platform: account.platform,
      }).map((issue) => `${PLATFORM_LABELS[account.platform]}: ${issue.message}`),
    );
  }, [form, selectedAccounts, selectedMedia]);

  function patch(partial) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function toggle(list, value) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save() {
    const payload = {
      ...form,
      collectionId: form.collectionId || null,
    };
    if (id) return api(`/posts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    return api("/posts", { method: "POST", body: JSON.stringify(payload) });
  }

  async function run(action) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const saved = await save();
      if (action === "draft") {
        setNotice("Draft saved. Nothing was sent.");
        navigate(`/posts/${saved.id}`);
        return;
      }
      if (action === "schedule") {
        const scheduled = await api(`/posts/${saved.id}/schedule`, {
          method: "POST",
          body: JSON.stringify({ scheduledAt: new Date(when).toISOString() }),
        });
        setPost(scheduled);
        setNotice("Scheduled as a simulation. Nothing has been sent.");
        navigate(`/posts/${scheduled.id}`);
        return;
      }
      if (action === "publish") {
        const result = await api(`/posts/${saved.id}/publish`, { method: "POST" });
        setPost(result);
        setNotice(result.targets.map((target) => target.summary).join(" "));
        navigate(`/posts/${result.id}`);
        return;
      }
      if (action === "retry") {
        const result = await api(`/posts/${id}/retry`, { method: "POST" });
        setPost(result);
        setNotice(result.targets.map((target) => target.summary).filter(Boolean).join(" "));
      }
      if (action === "cancel") {
        const result = await api(`/posts/${id}/cancel`, { method: "POST" });
        setPost(result);
        setNotice("Cancelled before the simulation ran. Nothing was sent.");
      }
    } catch (err) {
      setError(err.fields?.composition || err.message);
    } finally {
      setPending(false);
    }
  }

  const locked = post && ["published", "publishing", "partial"].includes(post.status);
  const liveSelected = selectedAccounts.some((account) => account.connectionMode === "live");
  const stamp = post ? stampFor(post) : null;
  const brand = brands.find((item) => item.id === form.brandId);
  const tightest = selectedAccounts.length ? Math.min(...selectedAccounts.map((account) => LIMITS[account.platform].caption)) : null;

  return (
    <div className="canvas">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/posts">Posts</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{id ? "Edit" : "New post"}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {id ? form.title || "Edit post" : "New post"}
          </h1>
          <p className="finding">
            {post ? <StatusBadge post={post} /> : null}
            {stamp ? stamp.note || stamp.word : "A draft stays on the desk until you run a simulation."}
          </p>
        </div>
        <div className="actions">
          {id ? (
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const copy = await api(`/posts/${id}/duplicate`, { method: "POST" });
                navigate(`/posts/${copy.id}`);
              }}
            >
              <Copy size={16} aria-hidden="true" />
              Duplicate
            </button>
          ) : null}
          <Link className="btn" to="/posts">
            All posts
          </Link>
        </div>
      </div>
      {notice ? (
        <p className="notice" role="status">
          <Check size={16} aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="error-note" role="alert">
          {error}
        </p>
      ) : null}
      <div className="composer">
        <form
          className="composer-form"
          onSubmit={(event) => {
            event.preventDefault();
            run("draft");
          }}
        >
          <section className="panel form-section">
            <h2>Post</h2>
            <div className="field-pair">
              <label className="field">
                <span>Brand</span>
                <select value={form.brandId} disabled={Boolean(id)} onChange={(event) => patch({ brandId: event.target.value, accountIds: [], mediaIds: [], collectionId: "" })} required>
                  <option value="">Choose a brand</option>
                  {brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Set</span>
                <select value={form.collectionId} onChange={(event) => patch({ collectionId: event.target.value })}>
                  <option value="">No set</option>
                  {sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Name</span>
              <input value={form.title} onChange={(event) => patch({ title: event.target.value })} required maxLength={140} placeholder="Only you see this name" />
            </label>
            <fieldset className="field">
              <legend>Format</legend>
              <div className="choice-row">
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <label key={value} className="choice">
                    <input type="radio" name="format" value={value} checked={form.format === value} onChange={() => patch({ format: value })} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span className="field-label-row">
                Caption
                <span className={tightest && form.body.length > tightest ? "counter over" : "counter"}>
                  {form.body.length.toLocaleString("en-GB")}
                  {tightest ? ` / ${tightest.toLocaleString("en-GB")}` : ""}
                </span>
              </span>
              <textarea rows={6} value={form.body} onChange={(event) => patch({ body: event.target.value })} />
            </label>
          </section>

          <section className="panel form-section">
            <div className="section-head">
              <h2>Files</h2>
              <p className="meta">{form.mediaIds.length ? `${form.mediaIds.length} selected, in the order you picked them.` : "Pick files from this brand's library."}</p>
            </div>
            {media.length ? (
              <ul className="pick-grid">
                {media.map((item) => {
                  const order = form.mediaIds.indexOf(item.id);
                  return (
                    <li key={item.id}>
                      <label className={order >= 0 ? "pick on" : "pick"}>
                        <input type="checkbox" checked={order >= 0} onChange={() => patch({ mediaIds: toggle(form.mediaIds, item.id) })} />
                        {item.kind === "image" ? (
                          <img src={fileUrl(item.id)} alt="" />
                        ) : (
                          <span className="pick-video">
                            <Film size={20} aria-hidden="true" />
                          </span>
                        )}
                        {order >= 0 ? (
                          <span className="pick-order" aria-hidden="true">
                            {order + 1}
                          </span>
                        ) : null}
                        <span className="pick-name">
                          {item.originalName}
                          <span className="meta">
                            {item.sample ? "Sample · " : ""}
                            {item.kind}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title={form.brandId ? "This brand has no files yet." : "Choose a brand to see its files."}
                action={
                  form.brandId ? (
                    <Link className="btn small" to="/media">
                      Open the library
                    </Link>
                  ) : null
                }
              />
            )}
          </section>

          <section className="panel form-section">
            <div className="section-head">
              <h2>Accounts</h2>
              <p className="meta">Each account gets its own preview and its own result.</p>
            </div>
            {accounts.length ? (
              <ul className="account-grid">
                {accounts.map((account) => {
                  const supported = LIMITS[account.platform].formats.includes(form.format);
                  const disabled = !supported || account.status !== "connected";
                  const on = form.accountIds.includes(account.id);
                  return (
                    <li key={account.id}>
                      <label className={["account-pick", on ? "on" : "", disabled ? "off" : ""].filter(Boolean).join(" ")}>
                        <input type="checkbox" disabled={disabled} checked={on} onChange={() => patch({ accountIds: toggle(form.accountIds, account.id) })} />
                        <NetworkIcon platform={account.platform} size={16} />
                        <span className="account-text">
                          <span>
                            {PLATFORM_LABELS[account.platform]} <span className="net-handle">@{account.handle}</span>
                          </span>
                          <span className="meta">
                            {account.connectionMode === "live" ? "Live" : "Simulated"}
                            {!supported ? ` · ${FORMAT_LABELS[form.format]} is not available here` : ""}
                            {account.status !== "connected" ? " · Disconnected" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title={form.brandId ? "This brand has no accounts yet." : "Choose a brand to see its accounts."}
                action={
                  form.brandId ? (
                    <Link className="btn small" to="/brands">
                      Connect an account
                    </Link>
                  ) : null
                }
              />
            )}
          </section>

          {issues.length ? (
            <ul className="issues" aria-label="Fix before running">
              {issues.map((issue) => (
                <li key={issue}>
                  <AlertCircle size={16} aria-hidden="true" />
                  {issue}
                </li>
              ))}
            </ul>
          ) : null}

          <section className="panel form-section run-bar">
            <label className="field slot-field">
              <span>Slot</span>
              <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
            </label>
            <div className="actions">
              <button className="btn" type="submit" disabled={pending || locked}>
                Save draft
              </button>
              {post?.status === "failed" || post?.status === "partial" ? (
                <button className="btn" type="button" disabled={pending} onClick={() => run("retry")}>
                  Retry simulation
                </button>
              ) : null}
              {post?.status === "scheduled" ? (
                <button className="btn" type="button" disabled={pending} onClick={() => run("cancel")}>
                  Cancel slot
                </button>
              ) : null}
              <button className="btn" type="button" disabled={pending || locked || !when || issues.length > 0} onClick={() => run("schedule")}>
                Schedule simulation
              </button>
              <button className="btn primary" type="button" disabled={pending || locked || issues.length > 0} onClick={() => run("publish")}>
                {pending ? "Running" : liveSelected ? "Try live publish" : "Run simulation"}
              </button>
            </div>
            <p className="meta run-note">Run simulation does not send the post. The result will say so.</p>
          </section>
        </form>
        <div className="preview-column">
          <div className="preview-head">
            <h2>Previews</h2>
            <p className="meta">How each network would frame it. Nothing here is sent.</p>
          </div>
          {selectedAccounts.length === 0 ? (
            <div className="panel">
              <EmptyState title="Choose an account to see its frame." />
            </div>
          ) : null}
          {selectedAccounts.map((account) => (
            <Preview
              key={account.id}
              platform={account.platform}
              format={form.format}
              body={form.body}
              media={selectedMedia}
              handle={account.handle}
              name={account.displayName || brand?.name}
            />
          ))}
          {post?.attempts?.length ? (
            <section className="panel">
              <h2>Attempts</h2>
              <ol className="attempts">
                {post.attempts.map((attempt) => (
                  <li key={attempt.id} className={attempt.outcome === "succeeded" ? "ok" : "bad"}>
                    <p className="attempt-label">{attempt.statusLabel}</p>
                    <p className="meta">{attempt.summary}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function toLocal(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
