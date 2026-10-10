# Implementation plan and acceptance checks

1. **Foundation** — React/Vite client, Express/MySQL API, environment template, migration, and documented decisions. Acceptance: client builds and migration can initialize an empty database.
2. **Security** — Argon2id, persistent server sessions, CSRF, rate limiting, CORS, headers, protected routes. Acceptance: unauthenticated business API requests return 401.
3. **Core data** — Customer/vendor CRUD, search, archival protection, daily attendance with rate snapshots. Acceptance: archived parties retain history and attendance is unique by party/date.
4. **Financial workflow** — Transactional monthly bills, bill lines, payments, and balances. Acceptance: duplicate bills and overpayments are rejected.
5. **Experience** — responsive app shell, loading/empty/error states, report filters/CSV, settings. Acceptance: primary navigation and controls call real APIs.

Known planned extension: dedicated automated API/component suites can be added once a local MySQL test schema is provisioned; no tests are allowed to target a business database.
