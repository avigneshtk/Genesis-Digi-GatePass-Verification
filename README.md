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

