import { useEffect, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { LIMITS, PLATFORM_LABELS, PLATFORMS } from "@socialhub/contracts";
import { api } from "../api.js";
import { BrandAvatar, EmptyState, ErrorNote, NetworkIcon } from "../components/ui.jsx";
import { FORMAT_LABELS } from "../format.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Brands() {
  const heading = usePage("Brands");
  const { brands, brandId, setBrandId } = useDesk();
  const [accounts, setAccounts] = useState([]);
  const [sets, setSets] = useState([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function load() {
    Promise.all([api("/accounts"), api("/collections")])
      .then(([accountRows, setRows]) => {
        setAccounts(accountRows);
        setSets(setRows);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function createBrand(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/brands", { method: "POST", body: JSON.stringify({ name, description }) });
      setName("");
      setDescription("");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Brands
          </h1>
          <p className="finding">Each brand keeps its own accounts. Connections here are simulated.</p>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="brand-grid">
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            active={brand.id === brandId}
            accounts={accounts.filter((account) => account.brandId === brand.id)}
            sets={sets.filter((set) => set.brandId === brand.id)}
            onChange={load}
            onUse={() => setBrandId(brand.id)}
            onError={setError}
          />
        ))}
        <form className="panel new-brand" onSubmit={createBrand}>
          <h2>Add a brand</h2>
          <p className="meta">A brand holds its own accounts, files, and sets.</p>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            <span>What it is</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button className="btn primary" type="submit">
            <Plus size={16} aria-hidden="true" />
            Add brand
          </button>
        </form>
      </div>
    </div>
  );
}

function BrandCard({ brand, active, accounts, sets, onChange, onUse, onError }) {
  const [platform, setPlatform] = useState("instagram");
  const [displayName, setDisplayName] = useState(brand.name);
  const [handle, setHandle] = useState("");
  const [setName, setSetName] = useState("");

  async function connect(event) {
    event.preventDefault();
    try {
      await api(`/brands/${brand.id}/accounts`, {
        method: "POST",
        body: JSON.stringify({ platform, displayName, handle, connectionMode: "simulated" }),
      });
      setHandle("");
      onChange();
    } catch (err) {
      onError(err.message);
    }
  }

  async function addSet(event) {
    event.preventDefault();
    try {
      await api("/collections", { method: "POST", body: JSON.stringify({ brandId: brand.id, name: setName }) });
      setSetName("");
      onChange();
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <section className={active ? "panel brand-card active" : "panel brand-card"}>
      <header className="brand-head">
        <BrandAvatar name={brand.name} size="md" />
        <div className="brand-title">
          <h2>{brand.name}</h2>
          {brand.description ? <p className="meta">{brand.description}</p> : null}
        </div>
        {active ? (
          <span className="badge badge-simulated">
            <Check size={14} aria-hidden="true" />
            Working here
          </span>
        ) : (
          <button type="button" className="btn small" onClick={onUse}>
            Work in this brand
          </button>
        )}
      </header>

      <div className="brand-section">
        <h3>
          Accounts <span className="count">{accounts.length}</span>
        </h3>
        {accounts.length ? (
          <ul className="account-rows">
            {accounts.map((account) => (
              <li key={account.id}>
                <NetworkIcon platform={account.platform} size={16} />
                <div className="account-text">
                  <p>
                    {PLATFORM_LABELS[account.platform]} <span className="net-handle">@{account.handle}</span>
                  </p>
                  <p className="meta" title={account.externalId || undefined}>
                    <span className={account.status === "connected" ? "state-dot on" : "state-dot"} aria-hidden="true" />
                    {account.connectionMode === "live" ? "Live" : "Simulated"} · {account.status}
                  </p>
                </div>
                <div className="row-actions">
                  {account.connectionMode !== "live" ? (
                    <button
                      type="button"
                      className={account.simulateNextFailure ? "toggle on" : "toggle"}
                      aria-pressed={Boolean(account.simulateNextFailure)}
                      onClick={() => api(`/accounts/${account.id}/failure`, { method: "POST", body: JSON.stringify({ enabled: !account.simulateNextFailure }) }).then(onChange)}
                    >
                      {account.simulateNextFailure ? "Will fail next" : "Fail next simulation"}
                    </button>
                  ) : null}
                  <button type="button" className="text-button" onClick={() => api(`/accounts/${account.id}/disconnect`, { method: "POST" }).then(onChange)}>
                    Disconnect
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No accounts yet." />
        )}
        <details className="disclosure">
          <summary>
            <Plus size={16} aria-hidden="true" />
            Connect a simulated account
            <ChevronDown size={16} className="disclosure-chevron" aria-hidden="true" />
          </summary>
          <form className="connect-form" onSubmit={connect}>
            <label className="field">
              <span>Network</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                {PLATFORMS.map((item) => (
                  <option key={item} value={item}>
                    {PLATFORM_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Handle</span>
              <input value={handle} onChange={(event) => setHandle(event.target.value)} required placeholder="brand" />
            </label>
            <p className="meta connect-hint">
              {PLATFORM_LABELS[platform]} takes {LIMITS[platform].formats.map((item) => FORMAT_LABELS[item].toLowerCase()).join(", ")} posts.
            </p>
            <button className="btn" type="submit">
              Connect simulation
            </button>
          </form>
        </details>
      </div>

      <div className="brand-section">
        <h3>
          Sets <span className="count">{sets.length}</span>
        </h3>
        {sets.length ? (
          <ul className="set-chips">
            {sets.map((set) => (
              <li key={set.id}>{set.name}</li>
            ))}
          </ul>
        ) : null}
        <form className="inline-form" onSubmit={addSet}>
          <label className="field grow">
            <span className="sr-only">New set name</span>
            <input value={setName} onChange={(event) => setSetName(event.target.value)} placeholder="Name a new set" required />
          </label>
          <button className="btn" type="submit">
            Add set
          </button>
        </form>
      </div>

      <footer className="brand-foot">
        <button
          type="button"
          className="text-button danger-text"
          onClick={() => {
            if (window.confirm(`Delete ${brand.name}, its posts, files, and simulated history? Nothing is recalled from a network, because nothing was sent.`)) {
              api(`/brands/${brand.id}`, { method: "DELETE" }).then(() => window.location.reload()).catch((err) => onError(err.message));
            }
          }}
        >
          Delete brand
        </button>
      </footer>
    </section>
  );
}
