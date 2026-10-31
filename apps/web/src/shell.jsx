import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, CalendarDays, ChevronDown, History, Image, Layers, LayoutDashboard, LogOut, Menu, Plus, SquarePen, X } from "lucide-react";
import { api, setToken } from "./api.js";
import { BrandAvatar } from "./components/ui.jsx";

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

const TABS = LINKS.slice(0, 4);

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

  const scoped = brands.find((brand) => brand.id === brandId);
  const live = integrations?.mode === "live";
  const userName = user?.name || "Owner";

  return (
    <DeskContext.Provider value={{ brands, brandId, setBrandId: chooseBrand, user, integrations }}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="app">
        <header className="topbar">
          <button type="button" className="icon-button" aria-expanded={open} aria-controls="nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
          <span className="topbar-title">
            <PocketMark />
            {scoped ? scoped.name : "SocialHub"}
          </span>
          <Link className="btn primary small" to="/posts/new">
            <Plus size={16} aria-hidden="true" />
            New post
          </Link>
        </header>
        <nav id="nav" className={open ? "sidebar open" : "sidebar"} aria-label="SocialHub">
          <div className="brand-lockup">
            <PocketMark />
            <div>
              <p className="product">SocialHub</p>
              <p className="product-note">Personal desk</p>
            </div>
          </div>
          <label className="scope">
            <span className="scope-label">Working in</span>
            <span className="scope-control">
              {scoped ? <BrandAvatar name={scoped.name} size="xs" /> : <span className="avatar avatar-xs hue-all" aria-hidden="true"><Layers size={12} /></span>}
              <select value={brandId} onChange={(event) => chooseBrand(event.target.value)}>
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <Link className="btn new-post" to="/posts/new">
            <Plus size={16} aria-hidden="true" />
            New post
          </Link>
          <ul>
            {LINKS.map(([to, label, Icon]) => (
              <li key={to}>
                <NavLink to={to} end={to === "/"}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="sidebar-foot">
            <div className="sim-note" role="status">
              <p className="sim-title">
                <span className={live ? "pulse pulse-live" : "pulse"} aria-hidden="true" />
                {live ? "Live publishing is on" : "Simulation mode"}
              </p>
              <p className="sim-body">
                {integrations?.banner || "Simulated publishing is on. SocialHub is not sending anything to Facebook, Instagram, LinkedIn, or TikTok."}
              </p>
            </div>
            <div className="user-row">
              <span className="avatar avatar-sm hue-user" aria-hidden="true">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <div className="user-text">
                <p>{userName}</p>
                {user?.email ? <p className="user-mail">{user.email}</p> : null}
              </div>
              <button type="button" className="icon-button ghost" onClick={signOut}>
                <LogOut size={16} aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </button>
            </div>
          </div>
        </nav>
        <main id="content" inert={open ? true : undefined} tabIndex={-1}>
          <Outlet />
        </main>
        <nav className="tabbar" aria-label="Sections">
          {TABS.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={20} aria-hidden="true" />
              <span>{label === "Today's run" ? "Today" : label}</span>
            </NavLink>
          ))}
          <button type="button" aria-expanded={open} aria-controls="nav" onClick={() => setOpen((value) => !value)}>
            <Menu size={20} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </DeskContext.Provider>
  );
}

export function PocketMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="3" fill="currentColor" opacity="0.16" />
      <rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
