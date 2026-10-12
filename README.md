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

2. Copy `.env.example` to `server/.env` and set the database credentials, session secret, and development administrator credentials. Do not commit this file.
3. Install all packages and initialize the schema:

```bash
npm install
npm run install:all
cd server
npm run migrate
npm run seed:admin
```

4. Start both processes from the project root:

```bash
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

## Production

Render uses [render.yaml](render.yaml) to run the schema migration before starting the API. The server start command also verifies and applies safe pending migrations under a MySQL advisory lock, so an API deployment cannot start against missing application tables. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_SSL_CA` (the Aiven CA PEM with escaped newlines), and a long `SESSION_SECRET` in Render. The configured production database is `defaultdb` on port `26403`; never put its credentials in this repository.

Vercel builds `client/dist` using [vercel.json](vercel.json). Set `VITE_API_URL=https://m-dairy.onrender.com/api` in Vercel Production Environment Variables, then redeploy both services. `CLIENT_URL` on Render must be `https://m-dairy.vercel.app`.

After Render is deployed, provision an administrator once from a secure Render shell:

```bash
npm --prefix server run seed:admin
```

The command requires `ADMIN_USERNAME` and an `ADMIN_PASSWORD` of at least 12 characters. It does not print credentials.

## Main workflows

- Add customers/vendors and set their rates and default quantities.
- Record a day’s attendance (new entries begin absent; choosing present loads defaults).
- Generate one bill per party/month from saved present attendance.
- Record payment through the API; payment is rejected when it exceeds the outstanding balance.
- Download filtered attendance reports as CSV.

## Verification

```bash
npm run build
npm test
```

The project includes a production client build command. API integration requires the configured MySQL instance. See `docs/` for architecture, schema, security, and implementation details.
