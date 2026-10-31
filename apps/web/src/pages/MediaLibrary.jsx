import { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api, fileUrl } from "../api.js";
import { BrandChip, EmptyState, ErrorNote, SkeletonRows } from "../components/ui.jsx";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function MediaLibrary() {
  const heading = usePage("Library");
  const { brandId, brands } = useDesk();
  const [uploadBrand, setUploadBrand] = useState(brandId || "");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setUploadBrand(brandId || brands[0]?.id || "");
  }, [brandId, brands]);

  useEffect(() => {
    const query = brandId ? `?brandId=${brandId}` : "";
    setItems(null);
    api(`/media${query}`)
      .then(setItems)
      .catch((err) => {
        setError(err.message);
        setItems([]);
      });
  }, [brandId]);

  async function upload(event) {
    event.preventDefault();
    if (!file || !uploadBrand) return;
    setPending(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("brandId", uploadBrand);
    body.set("altText", altText);
    try {
      await api("/media", { method: "POST", body });
      const query = brandId ? `?brandId=${brandId}` : "";
      setItems(await api(`/media${query}`));
      setAltText("");
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete ${item.originalName}? Posts that use it will lose this file.`)) return;
    setError("");
    try {
      await api(`/media/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const brandName = (id) => brands.find((brand) => brand.id === id)?.name;

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Library
          </h1>
          <p className="finding">
            {items ? `${items.length} ${items.length === 1 ? "file" : "files"}. ` : ""}Sample swatches are generated, not photographs.
          </p>
        </div>
      </div>
      <form className="panel upload" onSubmit={upload}>
        <span className="upload-icon" aria-hidden="true">
          <Upload size={18} />
        </span>
        <label className="field">
          <span>Brand</span>
          <select value={uploadBrand} onChange={(event) => setUploadBrand(event.target.value)} required>
            <option value="">Choose a brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field file-field">
          <span>File</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="What is in the file" />
        </label>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Adding" : "Add file"}
        </button>
      </form>
      <ErrorNote>{error}</ErrorNote>
      {items === null ? (
        <div className="panel">
          <SkeletonRows rows={3} label="Loading files" />
        </div>
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState title="No files for this filter.">Add a JPEG, PNG, WebP, GIF, or a short video above.</EmptyState>
        </div>
      ) : (
        <ul className="library">
          {items.map((item) => (
            <li key={item.id} className="media-card">
              <div className="media-stage">
                {item.kind === "image" ? <img src={fileUrl(item.id)} alt={item.altText || item.originalName} loading="lazy" /> : <video src={fileUrl(item.id)} controls />}
                {item.sample ? <span className="media-tag">Sample</span> : null}
              </div>
              <div className="media-body">
                <div className="media-text">
                  <p className="media-name" title={item.originalName}>
                    {item.originalName}
                  </p>
                  <p className="meta">
                    {item.kind} · {Math.ceil(item.byteSize / 1024)} KB
                  </p>
                  {brandName(item.brandId) && !brandId ? (
                    <div className="cell-sub">
                      <BrandChip name={brandName(item.brandId)} />
                    </div>
                  ) : null}
                </div>
                <button type="button" className="icon-button ghost danger" onClick={() => remove(item)}>
                  <Trash2 size={16} aria-hidden="true" />
                  <span className="sr-only">Delete {item.originalName}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
