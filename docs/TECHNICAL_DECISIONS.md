# Technical decisions

M-DAIRY uses React function components, React Router, and Vite for a small, fast client bundle. Vite's current production build workflow and modern browser targeting informed this choice. The client is deliberately data-only: all business persistence and calculation happens in the API.

The API is Express with mysql2's promise pool and MySQL InnoDB. Monetary, rate, and quantity values use `DECIMAL`, not floating-point. Attendance has a unique party/date key; bills have a unique party/month key. Attendance, bill generation, and payments are transactional. A generated bill contains immutable line snapshots of attendance quantity and rates; corrections require an explicit operational adjustment rather than silently mutating issued financial history.

Authentication uses Argon2id password hashes and server-side sessions stored in MySQL. Cookies are HttpOnly, SameSite=Lax, and Secure in production. A CSRF token is required for state-changing calls, login is rate limited, Helmet supplies security headers, CORS is limited to the configured client origin, and request bodies/inputs are constrained. These choices follow OWASP authentication, session-management, and CSRF guidance reviewed on 2026-10-10.

No default production account is created. `seed:admin` only runs after explicit environment configuration and rejects weak passwords. Use a restricted MySQL application account.

The visual system uses a restrained blue/neutral palette, readable translucent surfaces, keyboard focus styles, reduced visual noise, responsive tables, and print rules. The `backdrop-filter` surface has an opaque fallback color.
