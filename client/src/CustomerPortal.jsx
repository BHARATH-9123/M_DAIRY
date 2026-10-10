import { useState } from "react";
import * as Icons from "lucide-react";
import { api } from "./api";
import { formatINR } from "./utils/currency";

export default function CustomerPortal({ onBack }) {
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await api(`/customer-portal/${encodeURIComponent(customerId.trim())}`),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login customer-portal">
      <section className="login-card portal-card">
        <div className="brand-mark">
          <Icons.Milk size={32} />
        </div>
        <p className="eyebrow">M-DAIRY CUSTOMER PORTAL</p>
        <h1>Your bills</h1>
        <p className="tagline">Enter the customer ID from your dairy.</p>
        <form onSubmit={submit}>
          <label>
            Customer ID
            <input
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              placeholder="For example: C01"
              autoComplete="off"
              required
              maxLength={32}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={loading}>
            <Icons.ReceiptText size={18} />
            {loading ? "Loading bills..." : "View bills"}
          </button>
        </form>
        {result && (
          <div className="portal-results">
            <div className="portal-customer">
              <b>{result.customer.name}</b>
              <span>Customer ID: {result.customer.code}</span>
            </div>
            {result.bills.length ? (
              <div className="portal-bills">
                {result.bills.map((bill) => (
                  <article key={bill.invoice_number}>
                    <div>
                      <b>{bill.bill_month}</b>
                      <span>{bill.invoice_number}</span>
                    </div>
                    <div>
                      <b>{formatINR(bill.total_amount)}</b>
                      <span>
                        Balance {formatINR(bill.balance)} ·{" "}
                        {bill.status.replace("_", " ")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="portal-empty">No issued bills are available yet.</p>
            )}
          </div>
        )}
        <button className="text-action" type="button" onClick={onBack}>
          <Icons.ArrowLeft size={17} />
          Back to administrator sign in
        </button>
      </section>
    </main>
  );
}
