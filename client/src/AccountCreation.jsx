import { useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "./api";

export default function AccountCreation() {
  const [form, setForm] = useState({
      displayName: "",
      username: "",
      password: "",
      confirmPassword: "",
    }),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const set = (key, value) => setForm({ ...form, [key]: value });
  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const account = await api("/users", {
        method: "POST",
        body: {
          displayName: form.displayName,
          username: form.username,
          password: form.password,
        },
      });
      setMessage(`Account “${account.displayName}” was created.`);
      setForm({
        displayName: "",
        username: "",
        password: "",
        confirmPassword: "",
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Create account</h1>
        </div>
      </div>
      <section className="glass settings">
        <h3>New administrator</h3>
        <p className="account-help">
          Create a secure account for another authorized M-DAIRY administrator.
        </p>
        <form className="entry-form" onSubmit={submit}>
          <div className="form-grid">
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
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                autoComplete="new-password"
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
                autoComplete="new-password"
                minLength="6"
                required
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="notice">{message}</p>}
          <button className="primary" disabled={saving}>
            <UserPlus size={17} />
            {saving ? "Creating..." : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
