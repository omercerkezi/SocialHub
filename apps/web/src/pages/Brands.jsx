import { useEffect, useState } from "react";
import { LIMITS, PLATFORM_LABELS, PLATFORMS } from "@socialhub/contracts";
import { api } from "../api.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Brands() {
  const heading = usePage("Brands");
  const { brands, setBrandId } = useDesk();
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
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Brands
          </h1>
          <p className="finding">Each brand keeps its own accounts. Connections here are simulated.</p>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="brand-grid">
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            accounts={accounts.filter((account) => account.brandId === brand.id)}
            sets={sets.filter((set) => set.brandId === brand.id)}
            onChange={load}
            onUse={() => setBrandId(brand.id)}
            onError={setError}
          />
        ))}
      </div>
      <form className="panel new-brand" onSubmit={createBrand}>
        <h2>Add a brand</h2>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="field">
          <span>What it is</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button className="btn primary" type="submit">
          Add brand
        </button>
      </form>
    </div>
  );
}

function BrandCard({ brand, accounts, sets, onChange, onUse, onError }) {
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
    <section className="panel">
      <header className="panel-head">
        <h2>{brand.name}</h2>
        <button type="button" className="text-button" onClick={onUse}>
          Work in this brand
        </button>
      </header>
      <p className="meta">{brand.description}</p>
      <ul className="rows">
        {accounts.map((account) => (
          <li key={account.id}>
            <div>
              <p>
                {PLATFORM_LABELS[account.platform]} · @{account.handle}
              </p>
              <p className="meta">
                {account.connectionMode === "live" ? "Live" : "Simulated"} · {account.status}
                {account.externalId?.startsWith("sim_") ? ` · ${account.externalId}` : ""}
              </p>
            </div>
            <div className="row-actions">
              {account.connectionMode !== "live" ? (
                <button
                  type="button"
                  className="text-button"
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
      <form className="inline-form" onSubmit={connect}>
        <label className="field">
          <span>Network</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            {PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {PLATFORM_LABELS[item]} · {LIMITS[item].formats.join(", ")}
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
          <input value={handle} onChange={(event) => setHandle(event.target.value)} required />
        </label>
        <button className="btn" type="submit">
          Connect simulation
        </button>
      </form>
      <form className="inline-form" onSubmit={addSet}>
        <label className="field">
          <span>Set</span>
          <input value={setName} onChange={(event) => setSetName(event.target.value)} placeholder={sets.map((set) => set.name).join(", ") || "Name a set"} />
        </label>
        <button className="btn" type="submit">
          Add set
        </button>
      </form>
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
    </section>
  );
}
