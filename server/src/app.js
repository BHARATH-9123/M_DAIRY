import express from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { config } from "./config.js";
import { pool, query } from "./db.js";
import {
  calculateAttendanceLine,
  calculateBill,
  calculateBalance,
} from "./billing.js";

const app = express(),
  MySQLStore = MySQLStoreFactory(session);
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin.replace(/\/$/, "")))
        return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(
  session({
    name: "mdairy.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore({
      ...config.db,
      createDatabaseTable: true,
      clearExpired: true,
    }),
    cookie: {
      httpOnly: true,
      sameSite: config.nodeEnv === "production" ? "none" : "lax",
      secure: config.nodeEnv === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
app.get("/api/csrf-token", (req, res) => {
  req.session.csrfToken ??= crypto.randomBytes(32).toString("hex");
  res.json({ data: { token: req.session.csrfToken } });
});
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const candidate = req.get("CSRF-Token") || "";
  const expected = req.session.csrfToken || "";
  if (
    !expected ||
    candidate.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
  )
    return res.status(403).json({
      error: {
        message: "Your session token has expired. Refresh and try again.",
      },
    });
  next();
});
const auth = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ error: { message: "Authentication required" } });
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const hasAtMostTwoDecimals = (value) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
const partySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(2).max(150),
  phone: z.string().max(30).nullish(),
  address: z.string().max(2000).nullish(),
  milkType: z.enum(["cow", "buffalo", "both"]),
  schedule: z.enum(["morning", "night", "both"]),
  morningCowQty: z.coerce
    .number({ invalid_type_error: "Morning cow quantity must be a number" })
    .finite()
    .min(0)
    .max(999)
    .refine(hasAtMostTwoDecimals, "Quantity can have at most 2 decimal places"),
  morningBuffaloQty: z.coerce
    .number({ invalid_type_error: "Morning buffalo quantity must be a number" })
    .finite()
    .min(0)
    .max(999)
    .refine(hasAtMostTwoDecimals, "Quantity can have at most 2 decimal places"),
  nightCowQty: z.coerce
    .number({ invalid_type_error: "Night cow quantity must be a number" })
    .finite()
    .min(0)
    .max(999)
    .refine(hasAtMostTwoDecimals, "Quantity can have at most 2 decimal places"),
  nightBuffaloQty: z.coerce
    .number({ invalid_type_error: "Night buffalo quantity must be a number" })
    .finite()
    .min(0)
    .max(999)
    .refine(hasAtMostTwoDecimals, "Quantity can have at most 2 decimal places"),
  cowRate: z.coerce
    .number({ invalid_type_error: "Cow rate must be a number" })
    .finite()
    .min(0)
    .max(99999)
    .refine(hasAtMostTwoDecimals, "Rate can have at most 2 decimal places"),
  buffaloRate: z.coerce
    .number({ invalid_type_error: "Buffalo rate must be a number" })
    .finite()
    .min(0)
    .max(99999)
    .refine(hasAtMostTwoDecimals, "Rate can have at most 2 decimal places"),
  notes: z.string().max(2000).nullish(),
  active: z
    .union([
      z.boolean(),
      z.literal(0),
      z.literal(1),
      z.literal("0"),
      z.literal("1"),
    ])
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : value === true || value === 1 || value === "1",
    ),
});
const parse = (schema, input) => {
  const p = schema.safeParse(input);
  if (!p.success) {
    const issue = p.error.issues[0],
      field = issue.path.length ? `${issue.path.join(".")}: ` : "";
    const e = new Error(`${field}${issue.message}`);
    e.status = 422;
    throw e;
  }
  return p.data;
};
const columns = [
  "code",
  "name",
  "phone",
  "address",
  "milk_type",
  "schedule",
  "morning_cow_qty",
  "morning_buffalo_qty",
  "night_cow_qty",
  "night_buffalo_qty",
  "cow_rate",
  "buffalo_rate",
  "notes",
  "active",
];
const toParty = (p) => [
  p.code,
  p.name,
  p.phone || null,
  p.address || null,
  p.milkType,
  p.schedule,
  p.morningCowQty,
  p.morningBuffaloQty,
  p.nightCowQty,
  p.nightBuffaloQty,
  p.cowRate,
  p.buffaloRate,
  p.notes || null,
  p.active ?? true,
];
const typeGuard = (req) =>
  ["customer", "vendor"].includes(req.params.type) ? req.params.type : null;
app.get("/api/health", (req, res) => res.json({ data: { status: "ok" } }));
app.post(
  "/api/auth/register",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncRoute(async (req, res) => {
    const account = parse(
      z.object({
        username: z
          .string()
          .trim()
          .regex(
            /^[a-zA-Z0-9_.-]{3,60}$/,
            "Username must use 3 to 60 letters, numbers, dots, hyphens, or underscores",
          ),
        displayName: z.string().trim().min(2).max(120),
        password: z.string().min(6).max(200),
      }),
      req.body,
    );
    const hash = await argon2.hash(account.password, { type: argon2.argon2id });
    const [result] = await query(
      "INSERT INTO users(username,password_hash,display_name,role) VALUES (?,?,?,?)",
      [account.username, hash, account.displayName, "admin"],
    );
    req.session.regenerate((error) => {
      if (error) throw error;
      req.session.user = {
        id: result.insertId,
        username: account.username,
        displayName: account.displayName,
        role: "admin",
      };
      res.status(201).json({ data: req.session.user });
    });
  }),
);
app.get(
  "/api/auth/setup-status",
  asyncRoute(async (req, res) => {
    const [[row]] = await query("SELECT COUNT(*) count FROM users");
    res.json({ data: { needsSetup: Number(row.count) === 0 } });
  }),
);
app.post(
  "/api/auth/setup",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncRoute(async (req, res) => {
    const account = parse(
      z.object({
        username: z
          .string()
          .trim()
          .regex(
            /^[a-zA-Z0-9_.-]{3,60}$/,
            "Username must be 3 to 60 characters and use only letters, numbers, dots, hyphens, or underscores",
          ),
        displayName: z.string().trim().min(2).max(120),
        password: z.string().min(6).max(200),
      }),
      req.body,
    );
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[existing]] = await conn.execute(
        "SELECT COUNT(*) count FROM users FOR UPDATE",
      );
      if (Number(existing.count) > 0)
        return res.status(409).json({
          error: {
            message: "Initial setup is already complete. Please sign in.",
          },
        });
      const hash = await argon2.hash(account.password, {
        type: argon2.argon2id,
      });
      const [result] = await conn.execute(
        "INSERT INTO users(username,password_hash,display_name,role) VALUES (?,?,?,?)",
        [account.username, hash, account.displayName, "admin"],
      );
      await conn.commit();
      req.session.regenerate((error) => {
        if (error) throw error;
        req.session.user = {
          id: result.insertId,
          username: account.username,
          displayName: account.displayName,
          role: "admin",
        };
        res.status(201).json({ data: req.session.user });
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncRoute(async (req, res) => {
    const { username, password } = parse(
      z.object({
        username: z.string().min(1).max(60),
        password: z.string().min(1).max(200),
      }),
      req.body,
    );
    const [rows] = await query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    const user = rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password)))
      return res
        .status(401)
        .json({ error: { message: "Invalid username or password" } });
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.user = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      };
      res.json({ data: req.session.user });
    });
  }),
);
app.get("/api/auth/me", auth, (req, res) =>
  res.json({ data: req.session.user }),
);
app.post("/api/auth/logout", auth, (req, res) =>
  req.session.destroy(() => {
    res.clearCookie("mdairy.sid");
    res.status(204).end();
  }),
);
app.put(
  "/api/auth/password",
  auth,
  asyncRoute(async (req, res) => {
    const { currentPassword, newPassword } = parse(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6).max(200),
      }),
      req.body,
    );
    const [r] = await query("SELECT password_hash FROM users WHERE id=?", [
      req.session.user.id,
    ]);
    if (!r[0] || !(await argon2.verify(r[0].password_hash, currentPassword)))
      return res
        .status(400)
        .json({ error: { message: "Current password is incorrect" } });
    await query("UPDATE users SET password_hash=? WHERE id=?", [
      await argon2.hash(newPassword, { type: argon2.argon2id }),
      req.session.user.id,
    ]);
    res.status(204).end();
  }),
);
app.post(
  "/api/users",
  auth,
  asyncRoute(async (req, res) => {
    if (req.session.user.role !== "admin")
      return res
        .status(403)
        .json({ error: { message: "Administrator access required" } });
    const account = parse(
      z.object({
        username: z
          .string()
          .trim()
          .regex(
            /^[a-zA-Z0-9_.-]{3,60}$/,
            "Username must be 3 to 60 characters and use only letters, numbers, dots, hyphens, or underscores",
          ),
        displayName: z.string().trim().min(2).max(120),
        password: z.string().min(6).max(200),
      }),
      req.body,
    );
    const hash = await argon2.hash(account.password, { type: argon2.argon2id });
    const [result] = await query(
      "INSERT INTO users(username,password_hash,display_name,role) VALUES (?,?,?,?)",
      [account.username, hash, account.displayName, "admin"],
    );
    res.status(201).json({
      data: {
        id: result.insertId,
        username: account.username,
        displayName: account.displayName,
        role: "admin",
      },
    });
  }),
);
app.get(
  "/api/dashboard",
  auth,
  asyncRoute(async (req, res) => {
    const [[c], [v], [ca], [va]] = await Promise.all([
      query(
        "SELECT COUNT(*) count FROM parties WHERE party_type='customer' AND active=1",
      ),
      query(
        "SELECT COUNT(*) count FROM parties WHERE party_type='vendor' AND active=1",
      ),
      query(
        "SELECT COUNT(*) count FROM attendance a JOIN parties p ON p.id=a.party_id WHERE p.party_type='customer' AND a.attendance_date=CURDATE()",
      ),
      query(
        "SELECT COUNT(*) count FROM attendance a JOIN parties p ON p.id=a.party_id WHERE p.party_type='vendor' AND a.attendance_date=CURDATE()",
      ),
    ]);
    res.json({
      data: {
        customers: c[0].count,
        vendors: v[0].count,
        customerAttendance: ca[0].count,
        vendorAttendance: va[0].count,
      },
    });
  }),
);
app.get(
  "/api/:type(parties|customers|vendors)",
  auth,
  asyncRoute(async (req, res) => {
    let type =
      req.params.type === "customers"
        ? "customer"
        : req.params.type === "vendors"
          ? "vendor"
          : req.query.type;
    if (!["customer", "vendor"].includes(type))
      return res
        .status(400)
        .json({ error: { message: "Party type required" } });
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10)),
      search = `%${req.query.search || ""}%`,
      active = req.query.active;
    let where = "party_type=? AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)",
      params = [type, search, search, search];
    if (active === "true" || active === "false") {
      where += " AND active=?";
      params.push(active === "true");
    }
    const [[totalRows], [rows]] = await Promise.all([
      query(`SELECT COUNT(*) total FROM parties WHERE ${where}`, params),
      query(
        `SELECT * FROM parties WHERE ${where} ORDER BY active DESC,name LIMIT ? OFFSET ?`,
        [...params, limit, (page - 1) * limit],
      ),
    ]);
    res.json({ data: rows, meta: { page, limit, total: totalRows[0].total } });
  }),
);
app.post(
  "/api/:type(customers|vendors)",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor",
      p = parse(partySchema, req.body);
    const [r] = await query(
      `INSERT INTO parties(party_type,${columns.join(",")}) VALUES (?,${columns.map(() => "?").join(",")})`,
      [type, ...toParty(p)],
    );
    const [rows] = await query("SELECT * FROM parties WHERE id=?", [
      r.insertId,
    ]);
    res.status(201).json({ data: rows[0] });
  }),
);
app.put(
  "/api/:type(customers|vendors)/:id",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor",
      p = parse(partySchema, req.body);
    const [r] = await query(
      `UPDATE parties SET ${columns.map((c) => `${c}=?`).join(",")} WHERE id=? AND party_type=?`,
      [...toParty(p), req.params.id, type],
    );
    if (!r.affectedRows)
      return res.status(404).json({ error: { message: "Record not found" } });
    res.status(204).end();
  }),
);
app.delete(
  "/api/:type(customers|vendors)/:id",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor";
    const [[linked]] = await query(
      "SELECT (SELECT COUNT(*) FROM attendance WHERE party_id=?) +(SELECT COUNT(*) FROM bills WHERE party_id=?) count",
      [req.params.id, req.params.id],
    );
    if (linked.count) {
      await query("UPDATE parties SET active=0 WHERE id=? AND party_type=?", [
        req.params.id,
        type,
      ]);
      return res.status(204).end();
    }
    const [r] = await query("DELETE FROM parties WHERE id=? AND party_type=?", [
      req.params.id,
      type,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ error: { message: "Record not found" } });
    res.status(204).end();
  }),
);
app.get(
  "/api/attendance/:type(customers|vendors)",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor",
      date = parse(
        z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        req.query,
      ).date;
    const [rows] = await query(
      `SELECT p.*,a.id attendance_id,a.status,a.morning_cow_qty,a.morning_buffalo_qty,a.night_cow_qty,a.night_buffalo_qty,a.cow_rate attendance_cow_rate,a.buffalo_rate attendance_buffalo_rate, p.morning_cow_qty default_morning_cow_qty,p.morning_buffalo_qty default_morning_buffalo_qty,p.night_cow_qty default_night_cow_qty,p.night_buffalo_qty default_night_buffalo_qty FROM parties p LEFT JOIN attendance a ON a.party_id=p.id AND a.attendance_date=? WHERE p.party_type=? AND p.active=1 ORDER BY p.name`,
      [date, type],
    );
    res.json({ data: rows });
  }),
);
const attendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        partyId: z.coerce.number().int().positive(),
        status: z.enum(["present", "absent"]),
        morningCowQty: z.coerce
          .number()
          .finite()
          .min(0)
          .max(999)
          .refine(
            hasAtMostTwoDecimals,
            "Quantity can have at most 2 decimal places",
          ),
        morningBuffaloQty: z.coerce
          .number()
          .finite()
          .min(0)
          .max(999)
          .refine(
            hasAtMostTwoDecimals,
            "Quantity can have at most 2 decimal places",
          ),
        nightCowQty: z.coerce
          .number()
          .finite()
          .min(0)
          .max(999)
          .refine(
            hasAtMostTwoDecimals,
            "Quantity can have at most 2 decimal places",
          ),
        nightBuffaloQty: z.coerce
          .number()
          .finite()
          .min(0)
          .max(999)
          .refine(
            hasAtMostTwoDecimals,
            "Quantity can have at most 2 decimal places",
          ),
      }),
    )
    .min(1),
});
app.put(
  "/api/attendance/:type(customers|vendors)",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor",
      { date, entries } = parse(attendanceSchema, req.body),
      conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const e of entries) {
        const [[party]] = await conn.execute(
          "SELECT * FROM parties WHERE id=? AND party_type=? AND active=1",
          [e.partyId, type],
        );
        if (!party)
          throw Object.assign(new Error("Invalid party"), { status: 422 });
        const enteredQuantities =
          e.status === "absent"
            ? [0, 0, 0, 0]
            : [
                e.morningCowQty,
                e.morningBuffaloQty,
                e.nightCowQty,
                e.nightBuffaloQty,
              ];
        const q = [
          party.schedule === "night" || party.milk_type === "buffalo"
            ? 0
            : enteredQuantities[0],
          party.schedule === "night" || party.milk_type === "cow"
            ? 0
            : enteredQuantities[1],
          party.schedule === "morning" || party.milk_type === "buffalo"
            ? 0
            : enteredQuantities[2],
          party.schedule === "morning" || party.milk_type === "cow"
            ? 0
            : enteredQuantities[3],
        ];
        await conn.execute(
          `INSERT INTO attendance(party_id,attendance_date,status,morning_cow_qty,morning_buffalo_qty,night_cow_qty,night_buffalo_qty,cow_rate,buffalo_rate) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE cow_rate=IF(status='absent' AND VALUES(status)='present',VALUES(cow_rate),cow_rate),buffalo_rate=IF(status='absent' AND VALUES(status)='present',VALUES(buffalo_rate),buffalo_rate),status=VALUES(status),morning_cow_qty=VALUES(morning_cow_qty),morning_buffalo_qty=VALUES(morning_buffalo_qty),night_cow_qty=VALUES(night_cow_qty),night_buffalo_qty=VALUES(night_buffalo_qty)`,
          [e.partyId, date, e.status, ...q, party.cow_rate, party.buffalo_rate],
        );
      }
      await conn.commit();
      res.status(204).end();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }),
);
app.get(
  "/api/bills/:type(customers|vendors)",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor";
    const [rows] = await query(
      `SELECT b.*,p.name,p.code,
        COALESCE(SUM(pay.amount),0) AS paid_amount,
        b.total_amount-COALESCE(SUM(pay.amount),0) AS balance
       FROM bills b
       JOIN parties p ON p.id=b.party_id
       LEFT JOIN payments pay ON pay.bill_id=b.id
       WHERE p.party_type=?
       GROUP BY b.id,p.name,p.code
       ORDER BY b.bill_month DESC,b.id DESC`,
      [type],
    );
    res.json({ data: rows });
  }),
);
app.get(
  "/api/customer-portal/:code",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncRoute(async (req, res) => {
    const code = parse(z.string().trim().min(1).max(32), req.params.code);
    const [customers] = await query(
      "SELECT id,code,name FROM parties WHERE party_type='customer' AND code=? AND active=1",
      [code],
    );
    const customer = customers[0];
    if (!customer)
      return res.status(404).json({
        error: { message: "No active customer was found for that ID" },
      });

    const [bills] = await query(
      `SELECT b.invoice_number,b.bill_month,b.total_litres,b.total_amount,b.status,
        COALESCE(SUM(pay.amount),0) AS paid_amount,
        b.total_amount-COALESCE(SUM(pay.amount),0) AS balance
       FROM bills b
       LEFT JOIN payments pay ON pay.bill_id=b.id
       WHERE b.party_id=?
       GROUP BY b.id,b.invoice_number,b.bill_month,b.total_litres,b.total_amount,b.status
       ORDER BY b.bill_month DESC,b.id DESC`,
      [customer.id],
    );
    res.json({
      data: { customer: { code: customer.code, name: customer.name }, bills },
    });
  }),
);
app.post(
  "/api/bills/:type(customers|vendors)/generate",
  auth,
  asyncRoute(async (req, res) => {
    const type = req.params.type === "customers" ? "customer" : "vendor";
    const { partyId, month } = parse(
      z.object({
        partyId: z.coerce.number().int().positive(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }),
      req.body,
    );
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[party]] = await conn.execute(
        "SELECT id,code FROM parties WHERE id=? AND party_type=?",
        [partyId, type],
      );
      if (!party)
        throw Object.assign(new Error("Party not found"), { status: 404 });
      const [records] = await conn.execute(
        `SELECT * FROM attendance WHERE party_id=? AND attendance_date >= CONCAT(?,'-01') AND attendance_date < DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH) AND status='present' FOR UPDATE`,
        [partyId, month, month],
      );
      if (!records.length)
        throw Object.assign(
          new Error("No saved present attendance in this period"),
          { status: 422 },
        );
      const invoice = `${type === "customer" ? "C" : "V"}-${month.replace("-", "")}-${party.code}-${Date.now().toString().slice(-5)}`;
      const calculation = calculateBill(records);
      const [bill] = await conn.execute(
        "INSERT INTO bills(party_id,bill_month,invoice_number,total_litres,total_amount) VALUES (?,?,?,?,?)",
        [
          partyId,
          month,
          invoice,
          calculation.totalLitres,
          calculation.totalAmount,
        ],
      );
      for (const [index, r] of records.entries()) {
        const line = calculation.lines[index];
        await conn.execute(
          "INSERT INTO bill_lines(bill_id,attendance_id,service_date,cow_litres,buffalo_litres,cow_rate,buffalo_rate,line_total) VALUES (?,?,?,?,?,?,?,?)",
          [
            bill.insertId,
            r.id,
            r.attendance_date,
            line.cowLitres,
            line.buffaloLitres,
            r.cow_rate,
            r.buffalo_rate,
            line.lineTotal,
          ],
        );
      }
      await conn.commit();
      res
        .status(201)
        .json({ data: { id: bill.insertId, invoiceNumber: invoice } });
    } catch (e) {
      await conn.rollback();
      if (e.code === "ER_DUP_ENTRY")
        e = Object.assign(
          new Error("A bill already exists for this party and month"),
          { status: 409 },
        );
      throw e;
    } finally {
      conn.release();
    }
  }),
);
app.post(
  "/api/bills/:id/recalculate",
  auth,
  asyncRoute(async (req, res) => {
    parse(z.object({ confirm: z.literal(true) }), req.body);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[bill]] = await conn.execute(
        `SELECT b.*,p.party_type FROM bills b JOIN parties p ON p.id=b.party_id
         WHERE b.id=? FOR UPDATE`,
        [req.params.id],
      );
      if (!bill)
        throw Object.assign(new Error("Bill not found"), { status: 404 });
      const [previousLines] = await conn.execute(
        "SELECT attendance_id,service_date,cow_litres,buffalo_litres,cow_rate,buffalo_rate,line_total FROM bill_lines WHERE bill_id=? ORDER BY service_date,id",
        [bill.id],
      );
      const [payments] = await conn.execute(
        "SELECT amount FROM payments WHERE bill_id=? FOR UPDATE",
        [bill.id],
      );
      const [records] = await conn.execute(
        `SELECT * FROM attendance WHERE party_id=? AND attendance_date >= CONCAT(?,'-01')
         AND attendance_date < DATE_ADD(CONCAT(?,'-01'),INTERVAL 1 MONTH)
         AND status='present' FOR UPDATE`,
        [bill.party_id, bill.bill_month, bill.bill_month],
      );
      if (!records.length)
        throw Object.assign(
          new Error("No saved present attendance in this billing period"),
          { status: 422 },
        );
      const priorRates = new Map(
        previousLines.map((line) => [line.attendance_id, line]),
      );
      const calculationRecords = records.map((record) => {
        const priorLine = priorRates.get(record.id);
        return priorLine
          ? {
              ...record,
              cow_rate: priorLine.cow_rate,
              buffalo_rate: priorLine.buffalo_rate,
            }
          : record;
      });
      const calculation = calculateBill(calculationRecords);
      const paymentState = calculateBalance(calculation.totalAmount, payments);
      if (paymentState.balance < 0)
        throw Object.assign(
          new Error(
            "Recalculation would make recorded payments exceed the bill total",
          ),
          { status: 422 },
        );
      const [[revision]] = await conn.execute(
        "SELECT COALESCE(MAX(revision_number),0)+1 next_revision FROM bill_revisions WHERE bill_id=? FOR UPDATE",
        [bill.id],
      );
      await conn.execute(
        `INSERT INTO bill_revisions(bill_id,revision_number,previous_total_litres,previous_total_amount,previous_status,previous_lines)
         VALUES(?,?,?,?,?,?)`,
        [
          bill.id,
          revision.next_revision,
          bill.total_litres,
          bill.total_amount,
          bill.status,
          JSON.stringify(previousLines),
        ],
      );
      await conn.execute("DELETE FROM bill_lines WHERE bill_id=?", [bill.id]);
      for (const [index, record] of calculationRecords.entries()) {
        const line = calculation.lines[index];
        await conn.execute(
          "INSERT INTO bill_lines(bill_id,attendance_id,service_date,cow_litres,buffalo_litres,cow_rate,buffalo_rate,line_total) VALUES (?,?,?,?,?,?,?,?)",
          [
            bill.id,
            record.id,
            record.attendance_date,
            line.cowLitres,
            line.buffaloLitres,
            record.cow_rate,
            record.buffalo_rate,
            line.lineTotal,
          ],
        );
      }
      const status =
        paymentState.paidAmount === 0
          ? "issued"
          : paymentState.balance === 0
            ? "paid"
            : "part_paid";
      await conn.execute(
        "UPDATE bills SET total_litres=?,total_amount=?,paid_amount=?,status=? WHERE id=?",
        [
          calculation.totalLitres,
          calculation.totalAmount,
          paymentState.paidAmount,
          status,
          bill.id,
        ],
      );
      await conn.commit();
      res.json({
        data: {
          id: bill.id,
          totalLitres: calculation.totalLitres,
          totalAmount: calculation.totalAmount,
          paidAmount: paymentState.paidAmount,
          balance: paymentState.balance,
          revision: revision.next_revision,
        },
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);
app.post(
  "/api/bills/:id/payments",
  auth,
  asyncRoute(async (req, res) => {
    const p = parse(
      z.object({
        amount: z.coerce
          .number()
          .finite()
          .positive()
          .max(99999999)
          .refine(
            hasAtMostTwoDecimals,
            "Payment amount can have at most 2 decimal places",
          ),
        paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        method: z.string().max(40).optional(),
        reference: z.string().max(100).optional(),
        notes: z.string().max(1000).optional(),
      }),
      req.body,
    );
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[bill]] = await conn.execute(
        "SELECT * FROM bills WHERE id=? FOR UPDATE",
        [req.params.id],
      );
      if (!bill)
        throw Object.assign(new Error("Bill not found"), { status: 404 });
      const [existingPayments] = await conn.execute(
        "SELECT amount FROM payments WHERE bill_id=? FOR UPDATE",
        [bill.id],
      );
      const current = calculateBalance(bill.total_amount, existingPayments);
      if (p.amount > current.balance + 0.001)
        throw Object.assign(new Error("Payment exceeds outstanding balance"), {
          status: 422,
        });
      await conn.execute(
        "INSERT INTO payments(bill_id,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?)",
        [
          bill.id,
          p.amount,
          p.paymentDate,
          p.method || null,
          p.reference || null,
          p.notes || null,
        ],
      );
      const { paidAmount: paid, balance } = calculateBalance(
        bill.total_amount,
        [...existingPayments, { amount: p.amount }],
      );
      const status = balance <= 0 ? "paid" : "part_paid";
      await conn.execute("UPDATE bills SET paid_amount=?,status=? WHERE id=?", [
        paid,
        status,
        bill.id,
      ]);
      await conn.commit();
      res.status(201).json({ data: { paidAmount: paid, status } });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }),
);
app.get(
  "/api/reports/attendance",
  auth,
  asyncRoute(async (req, res) => {
    const { from, to, type } = parse(
      z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["customer", "vendor"]).optional(),
      }),
      req.query,
    );
    const [rows] = await query(
      `SELECT a.attendance_date,p.party_type,p.code,p.name,a.status,(a.morning_cow_qty+a.night_cow_qty) cow_litres,(a.morning_buffalo_qty+a.night_buffalo_qty) buffalo_litres FROM attendance a JOIN parties p ON p.id=a.party_id WHERE a.attendance_date BETWEEN ? AND ? ${type ? "AND p.party_type=?" : ""} ORDER BY a.attendance_date DESC,p.name`,
      type ? [from, to, type] : [from, to],
    );
    res.json({ data: rows });
  }),
);
app.get(
  "/api/settings",
  auth,
  asyncRoute(async (req, res) => {
    const [rows] = await query("SELECT * FROM business_settings WHERE id=1");
    res.json({ data: rows[0] });
  }),
);
app.put(
  "/api/settings",
  auth,
  asyncRoute(async (req, res) => {
    const s = parse(
      z.object({
        businessName: z.string().min(2).max(150),
        tagline: z.string().min(2).max(150),
        phone: z.string().max(30).optional(),
        address: z.string().max(2000).optional(),
        cowRate: z.coerce.number().min(0),
        buffaloRate: z.coerce.number().min(0),
      }),
      req.body,
    );
    await query(
      "UPDATE business_settings SET business_name=?,tagline=?,phone=?,address=?,cow_rate=?,buffalo_rate=? WHERE id=1",
      [
        s.businessName,
        s.tagline,
        s.phone || null,
        s.address || null,
        s.cowRate,
        s.buffaloRate,
      ],
    );
    res.status(204).end();
  }),
);
app.use((err, req, res, next) => {
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: { message: "A record with that value already exists" } });
  console.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.status
        ? err.message
        : "Something went wrong. Please try again.",
    },
  });
});
export default app;
