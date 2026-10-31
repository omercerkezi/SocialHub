import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, CalendarDays, History, Image, LayoutDashboard, LogOut, Menu, SquarePen, X } from "lucide-react";
import { api, setToken } from "./api.js";

const DeskContext = createContext(null);

export function useDesk() {
  return useContext(DeskContext);
}

const LINKS = [
  ["/", "Today's run", LayoutDashboard],
  ["/calendar", "Calendar", CalendarDays],
  ["/posts", "Posts", SquarePen],
  ["/media", "Library", Image],
  ["/brands", "Brands", Building2],
  ["/history", "History", History],
];

export function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(localStorage.getItem("socialhub.brand") || "");
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api("/brands"), api("/auth/me"), api("/integrations")])
      .then(([brandRows, me, network]) => {
        if (cancelled) return;
        setBrands(brandRows);
        setUser(me);
        setIntegrations(network);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function chooseBrand(value) {
    setBrandId(value);
    localStorage.setItem("socialhub.brand", value);
  }

  function signOut() {
    setToken("");
    navigate("/login");
  }

  return (
    <DeskContext.Provider value={{ brands, brandId, setBrandId: chooseBrand, user, integrations }}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="app">
        <header className="topbar">
          <button type="button" className="icon-button" aria-expanded={open} aria-controls="nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={16} /> : <Menu size={16} />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
          <span className="topbar-title">SocialHub</span>
        </header>
        <nav id="nav" className={open ? "sidebar open" : "sidebar"} aria-label="SocialHub">
          <div className="brand-lockup">
            <PocketMark />
            <div>
              <p className="product">SocialHub</p>
              <p className="product-note">Personal desk</p>
            </div>
          </div>
          <label className="field scope">
            <span>Brand</span>
            <select value={brandId} onChange={(event) => chooseBrand(event.target.value)}>
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <ul>
            {LINKS.map(([to, label, Icon]) => (
              <li key={to}>
                <NavLink to={to} end={to === "/"}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="sidebar-foot">
            <p className="sim-note" role="status">
              {integrations?.banner || "Simulated publishing is on. SocialHub is not sending anything to Facebook, Instagram, LinkedIn, or TikTok."}
            </p>
            <p className="user-row">{user?.name || "Owner"}</p>
            <button type="button" className="text-button" onClick={signOut}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </nav>
        <main id="content" inert={open ? true : undefined} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </DeskContext.Provider>
  );
}

function PocketMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
