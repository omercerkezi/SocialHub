import { useEffect, useState } from "react";
import { api, fileUrl } from "../api.js";
import { useDesk } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function MediaLibrary() {
  const heading = usePage("Library");
  const { brandId, brands } = useDesk();
  const [uploadBrand, setUploadBrand] = useState(brandId || "");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setUploadBrand(brandId || brands[0]?.id || "");
  }, [brandId, brands]);

  useEffect(() => {
    const query = brandId ? `?brandId=${brandId}` : "";
    api(`/media${query}`)
      .then(setItems)
      .catch((err) => setError(err.message));
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

  async function remove(id) {
    setError("");
    try {
      await api(`/media/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Library
          </h1>
          <p className="finding">Files for posts. Sample swatches are generated, not photographs.</p>
        </div>
      </div>
      <form className="upload" onSubmit={upload}>
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
        <label className="field">
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
      {error ? <p className="form-error">{error}</p> : null}
      <ul className="library">
        {items.map((item) => (
          <li key={item.id}>
            {item.kind === "image" ? <img src={fileUrl(item.id)} alt={item.altText || item.originalName} /> : <video src={fileUrl(item.id)} controls />}
            <p>{item.originalName}</p>
            <p className="meta">
              {item.sample ? "Sample · " : ""}
              {item.kind} · {Math.ceil(item.byteSize / 1024)} KB
            </p>
            <button type="button" className="text-button" onClick={() => remove(item.id)}>
              Delete file
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="meta">No files for this filter.</p> : null}
    </div>
  );
}
