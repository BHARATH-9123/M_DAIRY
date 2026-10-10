import { useState } from "react";
import { ArrowRight, Milk } from "lucide-react";
import { api } from "./api";

export default function InitialSetup({ onComplete, onCancel }) {
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
        await api("/auth/setup", {
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
        <p className="eyebrow">FIRST-TIME SETUP</p>
        <h1>Create administrator</h1>
        <p className="tagline">Set up your secure M-DAIRY owner account.</p>
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
            {saving ? "Creating..." : "Create administrator"}
            <ArrowRight />
          </button>
        </form>
        <button className="link-button" type="button" onClick={onCancel}>
          Back to sign in
        </button>
      </section>
    </main>
  );
}
