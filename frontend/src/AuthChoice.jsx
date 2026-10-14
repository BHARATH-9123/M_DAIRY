import { LogIn, Milk, UserPlus } from "lucide-react";

export default function AuthChoice({ onLogin, onCreate }) {
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand-mark">
          <Milk size={32} />
        </div>
        <p className="eyebrow">WELCOME TO</p>
        <h1>M-DAIRY</h1>
        <p className="tagline">From Farm To Home</p>
        <div className="auth-choice">
          <p>
            Your dairy workspace is ready. Sign in to an existing account or
            create the first administrator account.
          </p>
          <button className="primary wide" onClick={onLogin}>
            <LogIn size={18} />
            Sign in
          </button>
          <button className="secondary wide" onClick={onCreate}>
            <UserPlus size={18} />
            Create account
          </button>
        </div>
      </section>
    </main>
  );
}
