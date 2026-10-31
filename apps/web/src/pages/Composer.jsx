import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LIMITS, validateComposition } from "@socialhub/contracts";
import { api, fileUrl } from "../api.js";
import { Preview } from "../components/Preview.jsx";
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
    if (!form.brandId) return;
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
    if (!id) return;
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

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {id ? form.title || "Edit post" : "New post"}
          </h1>
          <p className="finding">{stamp ? `${stamp.word}. ${stamp.note}` : "A draft stays on the desk until you run a simulation."}</p>
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
              Duplicate
            </button>
          ) : null}
          <Link className="btn" to="/posts">
            All posts
          </Link>
        </div>
      </div>
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="composer">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run("draft");
          }}
        >
          <label className="field">
            <span>Brand</span>
            <select value={form.brandId} disabled={Boolean(id)} onChange={(event) => patch({ brandId: event.target.value, accountIds: [], mediaIds: [], collectionId: "" })} required>
              <option value="">Choose a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
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
          <label className="field">
            <span>Name</span>
            <input value={form.title} onChange={(event) => patch({ title: event.target.value })} required maxLength={140} />
          </label>
          <label className="field">
            <span>Format</span>
            <select value={form.format} onChange={(event) => patch({ format: event.target.value })}>
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Caption</span>
            <textarea rows={6} value={form.body} onChange={(event) => patch({ body: event.target.value })} />
          </label>
          <fieldset>
            <legend>Files</legend>
            <ul className="checks">
              {media.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.mediaIds.includes(item.id)}
                      onChange={() => patch({ mediaIds: toggle(form.mediaIds, item.id) })}
                    />
                    {item.kind === "image" ? <img src={fileUrl(item.id)} alt="" /> : null}
                    <span>
                      {item.originalName}
                      {item.sample ? " · Sample" : ""} · {item.kind}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {media.length === 0 ? <p className="meta">This brand has no files yet. Add some in the library.</p> : null}
          </fieldset>
          <fieldset>
            <legend>Accounts</legend>
            {accounts.map((account) => {
              const supported = LIMITS[account.platform].formats.includes(form.format);
              return (
                <label key={account.id} className="check-row">
                  <input
                    type="checkbox"
                    disabled={!supported || account.status !== "connected"}
                    checked={form.accountIds.includes(account.id)}
                    onChange={() => patch({ accountIds: toggle(form.accountIds, account.id) })}
                  />
                  <span>
                    {PLATFORM_LABELS[account.platform]} · @{account.handle} · {account.connectionMode === "live" ? "Live" : "Simulated"}
                    {!supported ? " · This format is not available here" : ""}
                    {account.status !== "connected" ? " · Disconnected" : ""}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {issues.length ? (
            <ul className="form-error">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          <label className="field">
            <span>Slot</span>
            <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
          </label>
          <div className="actions">
            <button className="btn" type="submit" disabled={pending || locked}>
              Save draft
            </button>
            <button className="btn" type="button" disabled={pending || locked || !when || issues.length > 0} onClick={() => run("schedule")}>
              Schedule simulation
            </button>
            <button className="btn primary" type="button" disabled={pending || locked || issues.length > 0} onClick={() => run("publish")}>
              {pending ? "Running" : liveSelected ? "Try live publish" : "Run simulation"}
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
          </div>
          <p className="meta">Run simulation does not send the post. The result will say so.</p>
        </form>
        <div className="preview-column">
          {selectedAccounts.length === 0 ? <p className="meta">Choose an account to see its frame.</p> : null}
          {selectedAccounts.map((account) => (
            <Preview key={account.id} platform={account.platform} format={form.format} body={form.body} media={selectedMedia} />
          ))}
          {post?.attempts?.length ? (
            <section className="panel">
              <h2>Attempts</h2>
              <ul className="rows">
                {post.attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <div>
                      <p>{attempt.statusLabel}</p>
                      <p className="meta">{attempt.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
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
