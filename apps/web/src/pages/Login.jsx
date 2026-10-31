import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, setToken, token } from "../api.js";
import { NetworkIcon } from "../components/ui.jsx";
import { PocketMark } from "../shell.jsx";
import { usePage } from "./usePage.js";

export function Login() {
  const heading = usePage("Sign in");
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@socialhub.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (token()) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(result.token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <section className="login-side" aria-hidden="true">
        <div className="brand-lockup">
          <PocketMark />
          <p className="product">SocialHub</p>
        </div>
        <div className="login-sample">
          <div className="slip">
            <div className="slip-date">
              <span className="slip-weekday">Tue</span>
              <span className="slip-day">3</span>
              <span className="slip-month">Nov</span>
              <span className="slip-when">11:00</span>
            </div>
            <div className="slip-body">
              <h2>Oak bench, north light</h2>
              <ul className="slip-nets">
                <li>
                  <NetworkIcon platform="instagram" />
                  Instagram
                </li>
                <li>
                  <NetworkIcon platform="facebook" />
                  Facebook
                </li>
              </ul>
              <p className="stamp tone-accent">
                <span>Scheduled</span>
                <span className="stamp-note">This slot will be simulated. Nothing is sent.</span>
              </p>
            </div>
          </div>
        </div>
        <p className="login-line">Plan every brand's posts on one desk, and see exactly what would go out before anything does.</p>
      </section>
      <section className="login-main">
        <form onSubmit={submit}>
          <div className="brand-lockup login-mobile-mark">
            <PocketMark />
            <p className="product">SocialHub</p>
          </div>
          <h1 ref={heading} tabIndex={-1}>
            Sign in
          </h1>
          <p className="finding">The desk for Furnio, Smart Leads, and the brands you add later. Publishing here is simulated.</p>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? (
            <p className="error-note" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn primary block" type="submit" disabled={pending}>
            {pending ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
