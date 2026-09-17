# Hostel Gatepass Verification System

A simple web app for hostel gate passes: students apply, the warden approves,
a QR code is generated, and gate security scans it to record entry/exit.

Built for a hackathon with a deliberately simple stack: HTML/CSS/JavaScript,
Node.js + Express, and SQLite (single file, no database server).

## Run

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

- Requires Node.js 23+ (the database uses the built-in `node:sqlite` module).
- The SQLite database is created automatically at `data/gatepass.db` on first run.
- To reset all demo data, delete `data/gatepass.db` and restart.

## Demo logins

| Role     | ID       | Password      |
|----------|----------|---------------|
| Student  | STU001   | student123    |
| Student  | STU002   | student123    |
| Warden   | WARDEN01 | warden123     |
| Security | SEC01    | security123   |

## The demo flow

1. Log in as **STU001** and apply for a gate pass (reason + leave/return times).
2. Log in as **WARDEN01** and approve the request.
3. Back as **STU001**, open the pass and click **Show QR**.
4. Log in as **SEC01** (in a second browser/incognito window), scan the QR with
   the camera — or type the token like `GP-8F42A91C` — and record **EXIT/ENTRY**.

## Project structure

```
frontend/   index.html, student.html, warden.html, security.html (+ css/ and js/)
backend/    server.js, database.js, session.js, routes/ (auth, gatepass, security)
data/       gatepass.db (created at runtime, never committed)
```

See `AGENTS.md` for the project rules (keep it simple!).
