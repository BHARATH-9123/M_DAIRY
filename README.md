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

Build the client with `npm run build`. Serve `client/dist` from a static web server and configure `CLIENT_URL`, `NODE_ENV=production`, HTTPS, a long random `SESSION_SECRET`, and a restricted MySQL account. Production does not generate a known administrator password; use explicit secure provisioning.

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
