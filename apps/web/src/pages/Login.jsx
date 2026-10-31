import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, setToken, token } from "../api.js";
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
      <form onSubmit={submit}>
        <div className="brand-lockup">
          <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 8h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
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
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
