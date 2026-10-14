# M-DAIRY — From Farm To Home

M-DAIRY is a responsive dairy management application for customers, vendors, daily attendance, monthly bills, payments, reporting, and business settings.

## Prerequisites

- Node.js 20+ and npm
- MySQL 8.4+ (or another supported MySQL 8 release)

## Install and configure

1. Create a MySQL database and restricted account, for example:

```sql
CREATE DATABASE m_dairy CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'm_dairy_app'@'localhost' IDENTIFIED BY 'replace_with_a_strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON m_dairy.* TO 'm_dairy_app'@'localhost';
```

2. Copy `.env.example` to `backend/.env` and set the database credentials, session secret, and development administrator credentials. Do not commit this file.

3. Install all packages and initialize the schema:

```bash
npm install
npm run install:all
npm --prefix backend run migrate
npm --prefix backend run seed:admin
```

4. Start both processes from the project root:

```bash
npm run dev
```

The frontend lives in `frontend/` and the backend in `backend/`. Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

## Production

**Backend — Render**

Render uses [render.yaml](render.yaml) to build and start the API. The `start` script runs pending migrations automatically on every deploy under a MySQL advisory lock.

You only need to set **one** secret variable in Render:

| Variable | Description / Value |
|---|---|
| `DATABASE_URL` | Your full database connection string (e.g. `mysql://user:pass@host:24193/defaultdb?ssl-mode=REQUIRED`) |

*Note: `SESSION_SECRET` is generated automatically by Render, and `CLIENT_URL` defaults to your Vercel domain (`https://m-dairy.vercel.app`).*

**Frontend — Vercel**

Vercel builds `frontend/dist` using [vercel.json](vercel.json). Set the following in Vercel **Production Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://m-dairy.onrender.com/api` |

After adding the variable, redeploy from the Vercel dashboard.

**Provision the first administrator**

After the Render service is live, run the following from a Render shell (one time only):

```bash
npm --prefix backend run seed:admin
```

The command requires `ADMIN_USERNAME` and `ADMIN_PASSWORD` (at least 12 characters). It does not print credentials to the console.

## Main workflows

- Add customers/vendors and set their rates and default quantities.
- Record a day's attendance (new entries begin absent; choosing present loads defaults).
- Generate one bill per party/month from saved present attendance.
- Record payment through the API; payment is rejected when it exceeds the outstanding balance.
- Download filtered attendance reports as CSV.

## Verification

```bash
npm run build
npm test
```

The project includes a production client build command. API integration tests require the configured MySQL instance. See `docs/` for architecture, schema, security, and implementation details.
