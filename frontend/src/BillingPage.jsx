import { useEffect, useState } from "react";
import { api } from "./api";
import { formatINR } from "./utils/currency";

export default function BillingPage({ type }) {
  const route = type === "Customer" ? "customers" : "vendors";
  const [bills, setBills] = useState([]),
    [parties, setParties] = useState([]),
    [partyId, setPartyId] = useState(""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [notice, setNotice] = useState("");
  const load = async (signal) => {
    const [billData, partyData] = await Promise.all([
      api(`/bills/${route}`, { signal }),
      api(`/${route}?limit=100`, { signal }),
    ]);
    if (!signal?.aborted) {
      setBills(billData);
      setParties(partyData);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((error) => {
      if (error.name !== "AbortError" && !controller.signal.aborted)
        setNotice(error.message);
    });
    return () => controller.abort();
  }, [route]);
  async function generate() {
    const existingBill = bills.find(
      (bill) =>
        Number(bill.party_id) === Number(partyId) && bill.bill_month === month,
    );
    if (existingBill) {
      await recalculate(existingBill);
      return;
    }
    try {
      const result = await api(`/bills/${route}/generate`, {
        method: "POST",
        body: { partyId: Number(partyId), month },
      });
      setNotice(
        `Bill ${result.invoiceNumber} issued from saved present attendance.`,
      );
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  }
  async function recalculate(bill) {
    if (
      !confirm(
        `Recalculate ${bill.invoice_number} from saved attendance? The prior totals and line snapshots will be retained in revision history.`,
      )
    )
      return;
    try {
      const result = await api(`/bills/${bill.id}/recalculate`, {
        method: "POST",
        body: { confirm: true },
      });
      setNotice(
        `${bill.invoice_number} recalculated (revision ${result.revision}): ${formatINR(result.totalAmount)}.`,
      );
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  }
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">MANAGE M-DAIRY</p>
          <h1>{type} billing</h1>
        </div>
      </div>
      {notice && <div className="notice">{notice}</div>}
      <section className="glass bill-create">
        <div>
          <h3>Generate or recalculate monthly bill</h3>
          <p>
            Only saved present attendance is billable. Rates are taken from each
            attendance snapshot. Choosing an existing invoice asks for
            confirmation before recalculating it.
          </p>
        </div>
        <select
          value={partyId}
          onChange={(event) => setPartyId(event.target.value)}
        >
          <option value="">Choose {type.toLowerCase()}</option>
          {parties.map((party) => (
            <option value={party.id} key={party.id}>
              {party.code} — {party.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
        <button className="primary" disabled={!partyId} onClick={generate}>
          Generate bill
        </button>
      </section>
      <div className="table-wrap glass">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>{type}</th>
              <th>Month</th>
              <th>Litres</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>
                  <b>{bill.invoice_number}</b>
                </td>
                <td>{bill.name}</td>
                <td>{bill.bill_month}</td>
                <td>{Number(bill.total_litres).toFixed(2)} L</td>
                <td>{formatINR(bill.total_amount)}</td>
                <td>{formatINR(bill.paid_amount)}</td>
                <td>{formatINR(bill.balance)}</td>
                <td>
                  <span className="status good">
                    {bill.status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <button
                    className="secondary bill-recalculate"
                    onClick={() => recalculate(bill)}
                  >
                    Recalculate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bills.length && (
          <div className="empty">
            No bills yet. Generate one from saved attendance.
          </div>
        )}
      </div>
    </main>
  );
}
