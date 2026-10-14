import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import * as Icons from "lucide-react";
import { api } from "./api";
import AccountCreation from "./AccountCreation";
import InitialSetup from "./InitialSetup";
import AuthChoice from "./AuthChoice";
import Register from "./Register";
import { formatINR, rateLabel } from "./utils/currency";
import BillingPage from "./BillingPage";
import CustomerPortal from "./CustomerPortal";
const nav = [
  ["/", Icons.LayoutDashboard, "Overview"],
  ["/customers", Icons.Users, "Customers"],
  ["/vendors", Icons.Truck, "Vendors"],
  ["/attendance/customers", Icons.CalendarCheck, "Customer attendance"],
  ["/attendance/vendors", Icons.ClipboardCheck, "Vendor attendance"],
  ["/billing/customers", Icons.Receipt, "Customer billing"],
  ["/billing/vendors", Icons.HandCoins, "Vendor billing"],
  ["/reports", Icons.BarChart3, "Reports"],
  ["/settings", Icons.Settings, "Settings"],
  ["/accounts", Icons.UserPlus, "Create account"],
];
function Login({ onLogin, onCreate, onCustomerLogin }) {
  const [username, setU] = useState(""),
    [password, setP] = useState(""),
    [show, setShow] = useState(false),
    [error, setE] = useState(""),
    [loading, setL] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setL(true);
    setE("");
    try {
      onLogin(
        await api("/auth/login", {
          method: "POST",
          body: { username, password },
        }),
      );
    } catch (e) {
      setE(e.message);
    } finally {
      setL(false);
    }
  }
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand-mark">
          <Icons.Milk size={32} />
        </div>
        <p className="eyebrow">WELCOME TO</p>
        <h1>M-DAIRY</h1>
        <p className="tagline">From Farm To Home</p>
        <form onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setU(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <span className="password">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setP(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Show password"
              >
                {show ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
            <Icons.ArrowRight />
          </button>
        </form>
        <button
          className="secondary wide login-create"
          type="button"
          onClick={onCreate}
        >
          <Icons.UserPlus size={18} />
          Create account
        </button>
        <button
          className="text-action login-customer"
          type="button"
          onClick={onCustomerLogin}
        >
          <Icons.ReceiptText size={17} />
          Customer: view your bills
        </button>
        <small>Secure dairy management for your business.</small>
      </section>
    </main>
  );
}
function Shell({ user, onLogout, children }) {
  const loc = useLocation(),
    go = useNavigate();
  return (
    <div className="app-shell">
      <aside>
        <div className="side-brand">
          <span className="brand-mark small">
            <Icons.Milk />
          </span>
          <div>
            <b>M-DAIRY</b>
            <small>From Farm To Home</small>
          </div>
        </div>
        <nav>
          {nav.map(([p, I, label]) => (
            <button
              key={p}
              onClick={() => go(p)}
              className={loc.pathname === p ? "active" : ""}
            >
              <I size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-footer">
          <div className="avatar">{user.displayName?.[0] || "A"}</div>
          <div>
            <b>{user.displayName}</b>
            <small>Administrator</small>
          </div>
          <button className="icon" onClick={onLogout} aria-label="Logout">
            <Icons.LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="content">
        <header>
          <div>
            <p className="eyebrow">M-DAIRY WORKSPACE</p>
            <h2>
              {nav.find((x) => x[0] === loc.pathname)?.[2] || "Management"}
            </h2>
          </div>
          <div className="header-date">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              month: "short",
              day: "numeric",
            }).format(new Date())}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        const data = await api("/dashboard", { signal: controller.signal });
        if (!controller.signal.aborted) setD(data);
      } catch (error) {
        if (error.name !== "AbortError")
          console.error("Unable to load dashboard", error);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, []);
  const cards = [
    [
      "Customers",
      "Manage household profiles and delivery preferences",
      "/customers",
      Icons.Users,
      d?.customers,
    ],
    [
      "Vendors",
      "Track the people who supply your milk",
      "/vendors",
      Icons.Truck,
      d?.vendors,
    ],
    [
      "Customer Attendance",
      "Record daily milk deliveries",
      "/attendance/customers",
      Icons.CalendarCheck,
      d?.customerAttendance,
    ],
    [
      "Vendor Attendance",
      "Record daily milk collection",
      "/attendance/vendors",
      Icons.ClipboardCheck,
      d?.vendorAttendance,
    ],
    [
      "Customer Billing",
      "Generate accurate monthly invoices",
      "/billing/customers",
      Icons.Receipt,
    ],
    [
      "Vendor Billing",
      "Manage supplier amounts and payments",
      "/billing/vendors",
      Icons.HandCoins,
    ],
    [
      "Reports",
      "See attendance and quantity history",
      "/reports",
      Icons.BarChart3,
    ],
    [
      "Settings",
      "Business details and account security",
      "/settings",
      Icons.Settings,
    ],
  ];
  const go = useNavigate();
  return (
    <>
      <section className="hero glass">
        <div>
          <p className="eyebrow">FROM FARM TO HOME</p>
          <h1>Good morning. Your dairy, at a glance.</h1>
          <p>
            Keep deliveries, collections, and customer care moving smoothly.
          </p>
        </div>
        <Icons.Sparkles size={48} />
      </section>
      <div className="cards">
        {cards.map(([t, desc, path, I, count]) => (
          <button className="menu-card glass" onClick={() => go(path)} key={t}>
            <span className="menu-icon">
              <I />
            </span>
            <div>
              <h3>{t}</h3>
              <p>{desc}</p>
            </div>
            {count !== undefined && <strong>{count}</strong>}
            <Icons.ChevronRight className="chev" />
          </button>
        ))}
      </div>
    </>
  );
}
const blank = {
  code: "",
  name: "",
  phone: "",
  address: "",
  milkType: "both",
  schedule: "both",
  morningCowQty: 0,
  morningBuffaloQty: 0,
  nightCowQty: 0,
  nightBuffaloQty: 0,
  cowRate: 0,
  buffaloRate: 0,
  notes: "",
  active: true,
};
function PartyForm({ initial, onSave, onCancel, type }) {
  const [f, setF] = useState(initial || blank),
    [err, setErr] = useState("");
  const set = (k, v) => setF({ ...f, [k]: v });
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onSave({
        ...f,
        morningCowQty: +f.morningCowQty,
        morningBuffaloQty: +f.morningBuffaloQty,
        nightCowQty: +f.nightCowQty,
        nightBuffaloQty: +f.nightBuffaloQty,
        cowRate: +f.cowRate,
        buffaloRate: +f.buffaloRate,
      });
    } catch (e) {
      setErr(e.message);
    }
  }
  const relevant = (animal, time) =>
    (f.milkType === "both" || f.milkType === animal) &&
    (f.schedule === "both" || f.schedule === time);
  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-grid">
        <Field
          label={`${type} code`}
          value={f.code}
          onChange={(v) => set("code", v)}
          required
        />
        <Field
          label={`${type} name`}
          value={f.name}
          onChange={(v) => set("name", v)}
          required
        />
        <Field
          label="Phone"
          value={f.phone}
          onChange={(v) => set("phone", v)}
        />
        <Field
          label="Address"
          value={f.address}
          onChange={(v) => set("address", v)}
        />
        <Select
          label="Milk type"
          value={f.milkType}
          onChange={(v) => set("milkType", v)}
          options={["cow", "buffalo", "both"]}
        />
        <Select
          label="Schedule"
          value={f.schedule}
          onChange={(v) => set("schedule", v)}
          options={["morning", "night", "both"]}
        />
        {relevant("cow", "morning") && (
          <Field
            label="Morning cow (L)"
            type="number"
            value={f.morningCowQty}
            onChange={(v) => set("morningCowQty", v)}
          />
        )}{" "}
        {relevant("buffalo", "morning") && (
          <Field
            label="Morning buffalo (L)"
            type="number"
            value={f.morningBuffaloQty}
            onChange={(v) => set("morningBuffaloQty", v)}
          />
        )}{" "}
        {relevant("cow", "night") && (
          <Field
            label="Night cow (L)"
            type="number"
            value={f.nightCowQty}
            onChange={(v) => set("nightCowQty", v)}
          />
        )}{" "}
        {relevant("buffalo", "night") && (
          <Field
            label="Night buffalo (L)"
            type="number"
            value={f.nightBuffaloQty}
            onChange={(v) => set("nightBuffaloQty", v)}
          />
        )}{" "}
        {f.milkType !== "buffalo" && (
          <Field
            label={rateLabel("Cow")}
            type="number"
            value={f.cowRate}
            onChange={(v) => set("cowRate", v)}
          />
        )}{" "}
        {f.milkType !== "cow" && (
          <Field
            label={rateLabel("Buffalo")}
            type="number"
            value={f.buffaloRate}
            onChange={(v) => set("buffaloRate", v)}
          />
        )}
      </div>
      <label>
        Notes
        <textarea
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
      {err && <p className="form-error">{err}</p>}
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary">Save {type}</button>
      </div>
    </form>
  );
}
function Parties({ type }) {
  const [rows, setRows] = useState([]),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [notice, setN] = useState("");
  const route = type === "Customer" ? "customers" : "vendors";
  const load = async (signal) => {
    const data = await api(
      `/${route}?search=${encodeURIComponent(search)}&limit=50`,
      { signal },
    );
    if (!signal?.aborted) setRows(data);
  };
  useEffect(() => {
    const controller = new AbortController();
    async function loadParties() {
      try {
        await load(controller.signal);
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted)
          setN(error.message);
      }
    }
    loadParties();
    return () => controller.abort();
  }, [search, route]);
  async function save(f) {
    await api(`/${route}${editing?.id ? "/" + editing.id : ""}`, {
      method: editing?.id ? "PUT" : "POST",
      body: f,
    });
    setEditing(null);
    setN(`${type} saved successfully.`);
    await load();
  }
  async function remove(row) {
    if (!confirm(`Archive ${row.name}?`)) return;
    await api(`/${route}/${row.id}`, { method: "DELETE" });
    setN(`${type} archived.`);
    await load();
  }
  return (
    <Page
      title={`${type}s`}
      action={() => setEditing(blank)}
      actionText={`Add ${type}`}
      notice={notice}
    >
      <div className="toolbar">
        <span className="search">
          <Icons.Search />
          <input
            placeholder={`Search ${type.toLowerCase()}s`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </span>
        <span>{rows.length} records</span>
      </div>
      {editing && (
        <Modal
          title={`${editing.id ? "Edit" : "Add"} ${type}`}
          close={() => setEditing(null)}
        >
          <PartyForm
            initial={editing}
            type={type}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      <div className="table-wrap glass">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Milk & schedule</th>
              <th>Rates</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>
                  <b>{r.name}</b>
                  <small>{r.address}</small>
                </td>
                <td>{r.phone || "—"}</td>
                <td>
                  <span className="badge">{r.milk_type}</span> {r.schedule}
                </td>
                <td>
                  {formatINR(r.cow_rate)} / {formatINR(r.buffalo_rate)}
                </td>
                <td>
                  <span className={r.active ? "status good" : "status"}>
                    {r.active ? "Active" : "Archived"}
                  </span>
                </td>
                <td>
                  <button
                    className="icon"
                    onClick={() =>
                      setEditing({
                        ...r,
                        milkType: r.milk_type,
                        morningCowQty: r.morning_cow_qty,
                        morningBuffaloQty: r.morning_buffalo_qty,
                        nightCowQty: r.night_cow_qty,
                        nightBuffaloQty: r.night_buffalo_qty,
                        cowRate: r.cow_rate,
                        buffaloRate: r.buffalo_rate,
                        active: Boolean(r.active),
                      })
                    }
                  >
                    <Icons.Pencil size={16} />
                  </button>
                  <button className="icon danger" onClick={() => remove(r)}>
                    <Icons.Archive size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty text={`No ${type.toLowerCase()}s found.`} />}
      </div>
    </Page>
  );
}
function Attendance({ type }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [rows, setRows] = useState([]),
    [note, setN] = useState("");
  const route = type === "Customer" ? "customers" : "vendors";
  function applyRows(data) {
    setRows(
      data.map((r) => ({
        ...r,
        status: r.status || "absent",
        morning_cow_qty: r.morning_cow_qty ?? r.default_morning_cow_qty ?? 0,
        morning_buffalo_qty:
          r.morning_buffalo_qty ?? r.default_morning_buffalo_qty ?? 0,
        night_cow_qty: r.night_cow_qty ?? r.default_night_cow_qty ?? 0,
        night_buffalo_qty:
          r.night_buffalo_qty ?? r.default_night_buffalo_qty ?? 0,
      })),
    );
  }
  async function refreshAttendance(signal) {
    const data = await api(`/attendance/${route}?date=${date}`, { signal });
    if (!signal?.aborted) applyRows(data);
  }
  useEffect(() => {
    const controller = new AbortController();
    async function loadAttendance() {
      try {
        await refreshAttendance(controller.signal);
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted)
          setN(error.message);
      }
    }
    loadAttendance();
    return () => controller.abort();
  }, [date, route]);
  function update(id, k, v) {
    setRows((currentRows) =>
      currentRows.map((r) => (r.id === id ? { ...r, [k]: v } : r)),
    );
  }
  function markPresent(id) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== id) return row;
        if (row.attendance_id) return { ...row, status: "present" };
        return {
          ...row,
          status: "present",
          morning_cow_qty: row.default_morning_cow_qty ?? 0,
          morning_buffalo_qty: row.default_morning_buffalo_qty ?? 0,
          night_cow_qty: row.default_night_cow_qty ?? 0,
          night_buffalo_qty: row.default_night_buffalo_qty ?? 0,
        };
      }),
    );
  }
  const applicable = (row, animal, session) =>
    (row.milk_type === "both" || row.milk_type === animal) &&
    (row.schedule === "both" || row.schedule === session);
  async function save() {
    try {
      await api(`/attendance/${route}`, {
        method: "PUT",
        body: {
          date,
          entries: rows.map((r) => ({
            partyId: r.id,
            status: r.status,
            morningCowQty: +r.morning_cow_qty,
            morningBuffaloQty: +r.morning_buffalo_qty,
            nightCowQty: +r.night_cow_qty,
            nightBuffaloQty: +r.night_buffalo_qty,
          })),
        },
      });
      await refreshAttendance();
      setN("Attendance saved successfully. Historical rates are now captured.");
    } catch (error) {
      setN(error.message);
    }
  }
  return (
    <Page title={`${type} attendance`} notice={note}>
      <div className="toolbar glass">
        <label className="date-picker">
          <Icons.Calendar />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <span>
          {rows.filter((r) => r.status === "present").length} present Â·{" "}
          {rows.filter((r) => r.status === "absent").length} absent
        </span>
        <button className="primary" onClick={save}>
          <Icons.Save />
          Save attendance
        </button>
      </div>
      <div className="attendance-list">
        {rows.map((r) => (
          <div className="attendance-row glass" key={r.id}>
            <div>
              <b>{r.name}</b>
              <small>
                {r.code} Â· {r.milk_type} Â· {r.schedule}
              </small>
            </div>
            <div className="segmented">
              <button
                className={r.status === "present" ? "selected" : ""}
                onClick={() => markPresent(r.id)}
              >
                Present
              </button>
              <button
                className={r.status === "absent" ? "selected absent" : ""}
                onClick={() => update(r.id, "status", "absent")}
              >
                Absent
              </button>
            </div>
            {r.status === "present" && (
              <div className="qty">
                {applicable(r, "cow", "morning") && (
                  <Qty
                    label="M Cow"
                    value={r.morning_cow_qty}
                    onChange={(v) => update(r.id, "morning_cow_qty", v)}
                  />
                )}
                {applicable(r, "buffalo", "morning") && (
                  <Qty
                    label="M Buff"
                    value={r.morning_buffalo_qty}
                    onChange={(v) => update(r.id, "morning_buffalo_qty", v)}
                  />
                )}
                {applicable(r, "cow", "night") && (
                  <Qty
                    label="N Cow"
                    value={r.night_cow_qty}
                    onChange={(v) => update(r.id, "night_cow_qty", v)}
                  />
                )}
                {applicable(r, "buffalo", "night") && (
                  <Qty
                    label="N Buff"
                    value={r.night_buffalo_qty}
                    onChange={(v) => update(r.id, "night_buffalo_qty", v)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        {!rows.length && (
          <Empty text={`No active ${type.toLowerCase()}s to record.`} />
        )}
      </div>
    </Page>
  );
}
function Billing({ type }) {
  const route = type === "Customer" ? "customers" : "vendors",
    [bills, setB] = useState([]),
    [parties, setP] = useState([]),
    [partyId, setId] = useState(""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [note, setN] = useState("");
  const load = async (signal) => {
    const data = await api(`/bills/${route}`, { signal });
    if (!signal?.aborted) setB(data);
  };
  useEffect(() => {
    const controller = new AbortController();
    async function loadBilling() {
      try {
        const [billData, partyData] = await Promise.all([
          api(`/bills/${route}`, { signal: controller.signal }),
          api(`/${route}?limit=100`, { signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) {
          setB(billData);
          setP(partyData);
        }
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted)
          setN(error.message);
      }
    }
    loadBilling();
    return () => controller.abort();
  }, [route]);
  async function generate() {
    try {
      const x = await api(`/bills/${route}/generate`, {
        method: "POST",
        body: { partyId: +partyId, month },
      });
      setN(`Bill ${x.invoiceNumber} issued.`);
      await load();
    } catch (e) {
      setN(e.message);
    }
  }
  return (
    <Page title={`${type} billing`} notice={note}>
      <section className="glass bill-create">
        <div>
          <h3>Generate monthly bill</h3>
          <p>Only saved present attendance is billable.</p>
        </div>
        <select value={partyId} onChange={(e) => setId(e.target.value)}>
          <option value="">Choose {type.toLowerCase()}</option>
          {parties.map((p) => (
            <option value={p.id} key={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
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
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>
                  <b>{b.invoice_number}</b>
                </td>
                <td>{b.name}</td>
                <td>{b.bill_month}</td>
                <td>{b.total_litres} L</td>
                <td>{formatINR(b.total_amount)}</td>
                <td>{formatINR(b.paid_amount)}</td>
                <td>{formatINR(b.balance)}</td>
                <td>
                  <span className="status good">
                    {b.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bills.length && (
          <Empty text="No bills yet. Generate one from attendance." />
        )}
      </div>
    </Page>
  );
}
function Reports() {
  const [from, setF] = useState(
      new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
    ),
    [to, setT] = useState(new Date().toISOString().slice(0, 10)),
    [rows, setRows] = useState([]);
  const load = async (signal) => {
    const data = await api(`/reports/attendance?from=${from}&to=${to}`, {
      signal,
    });
    if (!signal?.aborted) setRows(data);
  };
  useEffect(() => {
    const controller = new AbortController();
    async function loadReports() {
      try {
        await load(controller.signal);
      } catch (error) {
        if (error.name !== "AbortError")
          console.error("Unable to load reports", error);
      }
    }
    loadReports();
    return () => controller.abort();
  }, []);
  function csv() {
    const text = [
      "Date,Type,Code,Name,Status,Cow litres,Buffalo litres",
      ...rows.map((r) =>
        [
          r.attendance_date,
          r.party_type,
          r.code,
          r.name,
          r.status,
          r.cow_litres,
          r.buffalo_litres,
        ].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "m-dairy-attendance.csv";
    a.click();
  }
  return (
    <Page title="Reports">
      <div className="toolbar glass">
        <input
          type="date"
          value={from}
          onChange={(e) => setF(e.target.value)}
        />
        <input type="date" value={to} onChange={(e) => setT(e.target.value)} />
        <button className="primary" onClick={() => load()}>
          Apply filters
        </button>
        <button className="secondary" onClick={csv}>
          <Icons.Download />
          CSV
        </button>
      </div>
      <div className="table-wrap glass">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Party</th>
              <th>Status</th>
              <th>Cow L</th>
              <th>Buffalo L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.attendance_date?.slice(0, 10)}</td>
                <td>{r.party_type}</td>
                <td>
                  {r.name} <small>{r.code}</small>
                </td>
                <td>{r.status}</td>
                <td>{r.cow_litres}</td>
                <td>{r.buffalo_litres}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty text="No matching attendance data." />}
      </div>
    </Page>
  );
}
function Settings() {
  const [s, setS] = useState(null),
    [note, setN] = useState(""),
    [passwords, setPasswords] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [passwordNote, setPasswordNote] = useState(""),
    [savingProfile, setSavingProfile] = useState(false),
    [savingPassword, setSavingPassword] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function loadSettings() {
      try {
        const x = await api("/settings", { signal: controller.signal });
        if (!controller.signal.aborted)
          setS({
            businessName: x.business_name,
            tagline: x.tagline,
            phone: x.phone || "",
            address: x.address || "",
            cowRate: x.cow_rate,
            buffaloRate: x.buffalo_rate,
          });
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted)
          setN(error.message);
      }
    }
    loadSettings();
    return () => controller.abort();
  }, []);
  if (!s) return <div className="loading">Loading settings...</div>;
  const set = (k, v) => setS({ ...s, [k]: v });
  async function save(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: { ...s, cowRate: +s.cowRate, buffaloRate: +s.buffaloRate },
      });
      setN(
        "Business settings saved. Existing attendance and issued bills are unchanged.",
      );
    } catch (error) {
      setN(error.message);
    } finally {
      setSavingProfile(false);
    }
  }
  async function changePassword(event) {
    event.preventDefault();
    setPasswordNote("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordNote("New password and confirmation must match.");
      return;
    }
    setSavingPassword(true);
    try {
      await api("/auth/password", {
        method: "PUT",
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordNote("Password changed successfully.");
    } catch (error) {
      setPasswordNote(error.message);
    } finally {
      setSavingPassword(false);
    }
  }
  return (
    <Page title="Settings" notice={note}>
      <section className="glass settings">
        <h3>Business profile</h3>
        <form className="entry-form" onSubmit={save}>
          <div className="form-grid">
            <Field
              label="Business name"
              value={s.businessName}
              onChange={(v) => set("businessName", v)}
            />
            <Field
              label="Tagline"
              value={s.tagline}
              onChange={(v) => set("tagline", v)}
            />
            <Field
              label="Phone"
              value={s.phone}
              onChange={(v) => set("phone", v)}
            />
            <Field
              label="Address"
              value={s.address}
              onChange={(v) => set("address", v)}
            />
            <Field
              label={rateLabel("Default cow")}
              type="number"
              value={s.cowRate}
              onChange={(v) => set("cowRate", v)}
            />
            <Field
              label={rateLabel("Default buffalo")}
              type="number"
              value={s.buffaloRate}
              onChange={(v) => set("buffaloRate", v)}
            />
          </div>
          <button className="primary" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
      <section className="glass settings settings-section">
        <h3>Account security</h3>
        <p className="settings-copy">
          Change your password securely. Use at least six characters.
        </p>
        <form className="entry-form" onSubmit={changePassword}>
          <div className="form-grid">
            <Field
              label="Current password"
              type="password"
              value={passwords.currentPassword}
              required
              onChange={(v) =>
                setPasswords({ ...passwords, currentPassword: v })
              }
            />
            <Field
              label="New password"
              type="password"
              value={passwords.newPassword}
              required
              onChange={(v) => setPasswords({ ...passwords, newPassword: v })}
            />
            <Field
              label="Confirm new password"
              type="password"
              value={passwords.confirmPassword}
              required
              onChange={(v) =>
                setPasswords({ ...passwords, confirmPassword: v })
              }
            />
          </div>
          {passwordNote && (
            <p
              className={
                passwordNote.includes("successfully") ? "notice" : "form-error"
              }
            >
              {passwordNote}
            </p>
          )}
          <button className="secondary" disabled={savingPassword}>
            <Icons.KeyRound size={17} />
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
      <section className="glass settings settings-section">
        <h3>Data protection</h3>
        <div className="settings-policy">
          <div>
            <Icons.CalendarCheck />
            <span>
              <b>Attendance snapshots</b>Daily saved attendance keeps the rate
              that applied on that day.
            </span>
          </div>
          <div>
            <Icons.Receipt />
            <span>
              <b>Issued bills stay fixed</b>Changing defaults or customer rates
              never changes issued invoices.
            </span>
          </div>
          <div>
            <Icons.ShieldCheck />
            <span>
              <b>Safe defaults</b>New attendance starts absent until you
              explicitly mark it present.
            </span>
          </div>
        </div>
      </section>
    </Page>
  );
}
const formatRate = formatINR;
function Page({ title, action, actionText, notice, children }) {
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">MANAGE M-DAIRY</p>
          <h1>{title}</h1>
        </div>
        {action && (
          <button className="primary" onClick={action}>
            <Icons.Plus /> {actionText}
          </button>
        )}
      </div>
      {notice && (
        <div className="notice">
          <Icons.CheckCircle2 /> {notice}
        </div>
      )}
      {children}
    </main>
  );
}
function Field({ label, type = "text", value, onChange, required }) {
  return (
    <label>
      {label}
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value ?? ""}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function Qty({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Modal({ title, close, children }) {
  return (
    <div className="modal-bg" role="dialog">
      <div className="modal glass">
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="icon" onClick={close}>
            <Icons.X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="empty">
      <Icons.Inbox size={28} />
      <p>{text}</p>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(undefined),
    [setupMode, setSetupMode] = useState(false),
    [authView, setAuthView] = useState("choice");
  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const currentUser = await api("/auth/me", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setUser(currentUser);
      } catch (error) {
        if (controller.signal.aborted || error.name === "AbortError") return;
        if (error.status === 401) {
          try {
            const status = await api("/auth/setup-status", {
              signal: controller.signal,
            });
            if (!controller.signal.aborted) setSetupMode(status.needsSetup);
          } catch (setupError) {
            if (setupError.name !== "AbortError")
              console.error("Unable to check initial setup", setupError);
          }
          setUser(null);
          return;
        }
        setUser(null);
      }
    }
    loadSession();
    return () => controller.abort();
  }, []);
  if (user === undefined)
    return <div className="loading">Loading M-DAIRY...</div>;
  if (!user && setupMode && authView === "choice")
    return (
      <AuthChoice
        onLogin={() => setAuthView("login")}
        onCreate={() => setAuthView("setup")}
      />
    );
  if (!user && setupMode && authView === "setup")
    return (
      <InitialSetup
        onComplete={setUser}
        onCancel={() => setAuthView("choice")}
      />
    );
  if (!user && authView === "register")
    return (
      <Register onComplete={setUser} onBack={() => setAuthView("login")} />
    );
  if (!user && authView === "customer")
    return <CustomerPortal onBack={() => setAuthView("login")} />;
  if (!user)
    return (
      <Login
        onLogin={setUser}
        onCreate={() => setAuthView("register")}
        onCustomerLogin={() => setAuthView("customer")}
      />
    );
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };
  return (
    <Shell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Parties type="Customer" />} />
        <Route path="/vendors" element={<Parties type="Vendor" />} />
        <Route
          path="/attendance/customers"
          element={<Attendance type="Customer" />}
        />
        <Route
          path="/attendance/vendors"
          element={<Attendance type="Vendor" />}
        />
        <Route
          path="/billing/customers"
          element={<BillingPage type="Customer" />}
        />
        <Route
          path="/billing/vendors"
          element={<BillingPage type="Vendor" />}
        />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/accounts" element={<AccountCreation />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Shell>
  );
}
