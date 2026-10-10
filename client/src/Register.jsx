import { useState } from "react";
import { ArrowRight, Milk } from "lucide-react";
import { api } from "./api";

export default function Register({ onComplete, onBack }) {
  const [form, setForm] = useState({
      displayName: "",
      username: "",
      password: "",
      confirmPassword: "",
    }),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const set = (key, value) => setForm({ ...form, [key]: value });
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      onComplete(
        await api("/auth/register", {
          method: "POST",
          body: {
            displayName: form.displayName,
            username: form.username,
            password: form.password,
          },
        }),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand-mark">
          <Milk size={32} />
        </div>
        <p className="eyebrow">M-DAIRY ACCOUNT</p>
        <h1>Create account</h1>
        <p className="tagline">
          Create an account to access your dairy workspace.
        </p>
        <form onSubmit={submit}>
          <label>
            Full name
            <input
              value={form.displayName}
              onChange={(event) => set("displayName", event.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => set("username", event.target.value)}
              required
            />
          </label>
          <label>
            Password <small>At least 6 characters</small>
            <input
              type="password"
              value={form.password}
              onChange={(event) => set("password", event.target.value)}
              minLength="6"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => set("confirmPassword", event.target.value)}
              minLength="6"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
            <ArrowRight />
          </button>
        </form>
        <button className="link-button" type="button" onClick={onBack}>
          Already have an account? Sign in
        </button>
      </section>
    </main>
  );
}
