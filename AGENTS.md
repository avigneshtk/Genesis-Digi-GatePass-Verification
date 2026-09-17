Digital Hostel Gatepass Verification System

0. Current Status (read this first)

The project started as a Java/JavaFX desktop prototype. We decided to change it:
the desktop app is retired and we are now building a web app following this file.

Working demo flow (phase 1 is done, keep it working at all times):

LOGIN
  ↓
STUDENT REQUESTS PASS
  ↓
WARDEN APPROVES / REJECTS
  ↓
QR GENERATED
  ↓
SECURITY SCANS QR (or types the token)
  ↓
PASS VERIFIED
  ↓
ENTRY / EXIT RECORDED

1. What We Are Building

We are building a Digital Hostel Gatepass Verification System for a hackathon.

The basic idea:

Student
   ↓
Requests Gate Pass
   ↓
Warden Approves
   ↓
QR Code Generated
   ↓
Security Scans QR
   ↓
Gate Pass Verified
   ↓
Entry / Exit Recorded

The project should be simple, easy to understand, and easy to change.

This is a hackathon project, not a large production application.

2. Most Important Rule

Keep the project SIMPLE.

We are beginners.

Do not introduce complicated technologies or architecture unless we specifically ask for them.

The hackathon may give us new challenges during the event and ask us to modify the product.

Therefore:

Code should be easy to understand.

Features should be easy to add.

Avoid unnecessary abstractions.

Avoid overengineering.

Don't rewrite large parts of the project for small changes.

Prefer simple solutions.

A working simple solution is better than a complicated perfect solution.

3. Technology Stack

Use only these technologies unless we specifically ask to change them.

Frontend

HTML
CSS
JavaScript

Do NOT use:

React
Vue
Angular
Next.js

Backend

Node.js
Express.js

Database

SQLite (single file, opened with Node's built-in node:sqlite module — no extra
database server to install or start)

Why SQLite: the whole database is one file (data/gatepass.db). The demo works
on any laptop with just Node installed, and resetting the demo data is as simple
as deleting one file.

QR

qrcode (Node package) to generate QR codes as images.
html5-qrcode (loaded from a CDN in the security page) to scan QR codes with a
laptop/phone camera. A manual token entry box is always available as backup.

4. Basic Project Structure

Keep the structure simple.

hostel-gatepass/
│
├── frontend/
│   ├── index.html          (login page)
│   ├── student.html
│   ├── warden.html
│   ├── security.html
│   │
│   ├── css/
│   │   └── style.css       (one shared stylesheet)
│   │
│   └── js/
│       ├── api.js          (small fetch helper shared by all pages)
│       ├── student.js
│       ├── warden.js
│       └── security.js
│
├── backend/
│   ├── server.js           (starts Express, serves frontend + /api)
│   ├── database.js         (opens SQLite, creates tables, seeds demo users)
│   │
│   └── routes/
│       ├── auth.js         (login, logout, me)
│       ├── gatepass.js     (apply, list, approve, reject, QR)
│       └── security.js     (verify token, record entry/exit, activity log)
│
├── data/                   (gatepass.db lives here — never commit it)
├── package.json
└── README.md

This structure can be changed if there is a good reason.

Don't create 20 folders just to make the project look professional.

5. Main Users

There are three important users.

Student

Student can:

Login
Apply for a gate pass
See gate-pass status
See approved gate passes
Show QR code
See previous passes

Warden

Warden can:

Login
See pending requests
Approve a request
Reject a request
See previous requests

Security

Security can:

Login
Scan QR code (or type the token manually)
Check whether the pass is valid
Record entry
Record exit
See recent gate activity

6. Main Feature

The most important feature is:

Gate Pass → QR → Verification

Example:

Student applies for pass

Reason:
Going home

Leaving:
17 September, 5:00 PM

Returning:
18 September, 8:00 AM

Warden approves it.

The system creates a QR code.

Security scans the QR code.

The backend checks the pass.

If valid:

✓ VALID PASS
Student: Rahul
Room: B-204
Valid until: 18 September, 8:00 AM

[ RECORD EXIT ]

If invalid:

✕ INVALID PASS
Reason:
Pass has expired.

7. Database

SQLite tables (created automatically by database.js on first run).

users
id
name
email
password        (stored as a sha256 hash, never plain text)
role            (STUDENT / WARDEN / SECURITY)
studentId       (e.g. STU001, only for students)
roomNumber      (e.g. B-204, only for students)

gate_passes
id
studentId       (the user id of the student)
reason
fromDateTime    (ISO text, e.g. 2026-09-17T17:00)
toDateTime      (ISO text, e.g. 2026-09-18T08:00)
status
qrToken         (e.g. GP-8F42A91C, set when approved)

Possible status:

PENDING
APPROVED
REJECTED

(EXPIRED is not stored: when security verifies a pass, the backend checks the
current time against toDateTime and reports it as expired. This avoids a cron
job or timer — keep it that way unless a feature really needs it.)

gate_logs
gatePassId
studentId
action          (ENTRY / EXIT)
timestamp

Only add more fields when a feature actually needs them.

8. Coding Rules

Write code that a beginner can understand.

Use clear names:

createGatePass()
approveGatePass()
rejectGatePass()
verifyGatePass()
recordEntry()
recordExit()

Avoid names like:

x()
doThing()
processData2()

Keep functions reasonably small.

9. Frontend Rules

Use normal HTML, CSS and JavaScript.

For example:

<button id="approveButton">Approve</button>

approveButton.addEventListener("click", approvePass);

Don't introduce a framework just because a feature becomes slightly harder.

Use CSS classes for styling.

Keep the UI clean and modern.

It does not need to look like a huge enterprise application.

10. When the Hackathon Gives a New Challenge

This is VERY important.

During the hackathon, judges may say things like:

"Can you add parent approval?"
or:
"Can you add an emergency gate pass?"
or:
"Can you add an attendance feature?"
or:
"Can you add an AI feature?"

When this happens:

First

Understand what the challenge is asking.

Then

Find the smallest change needed to support it.

Do NOT

Immediately redesign the entire application.

For example, if they ask:

"Add parent approval."

Don't rebuild the authentication system.

Simply add something like:

Student requests pass
        ↓
Parent approves
        ↓
Warden approves
        ↓
QR generated

Add only what is necessary.

11. Hackathon Development Philosophy

The hackathon score depends heavily on how quickly we can respond to new challenges.

Therefore the code should be:

Simple → Flexible → Easy to Modify

Not:
Complex → Highly Abstracted → Difficult to Modify

When adding a feature, prefer:

Existing page
+
Small JavaScript change
+
Small backend route
+
Small database change

over rebuilding the application.

12. Don't Overengineer

Unless specifically requested, DO NOT add:

Microservices
Docker
Kubernetes
GraphQL
Redis
Kafka
Blockchain
Machine learning
Facial recognition
Complex authentication systems
Complex design patterns
Multiple databases
Complicated cloud infrastructure

We want to spend our time solving the hackathon challenges.

13. AI Coding Agent Rules

When an AI coding agent is asked to modify the project:

Before coding

Look at the existing code.

Understand how the current feature works.

Identify the smallest change needed.

While coding

Keep the existing code whenever possible.

Make small changes.

Reuse existing functions.

Don't introduce unnecessary libraries.

Don't change the technology stack.

Don't rewrite working features.

Keep the code beginner-friendly.

After coding

Make sure:

The old features still work.
The new feature works.
There are no obvious errors.
The UI still looks good.
The application can still be demonstrated easily.

14. If Something Is Ambiguous

If the requirement is unclear, choose the simplest reasonable solution.

For example:

If someone says:

"Add notifications."

For a hackathon demo, don't immediately build a complete notification infrastructure.

A simple notification inside the application may be enough:

🔔 Your gate pass has been approved.

Only build a more complicated system if we specifically need it.

15. Security

Use basic security practices.

Never:

Put real passwords in GitHub.
Put API keys in the code.
Put passwords inside QR codes.
Store unnecessary personal information in QR codes.

The QR code contains only a unique token such as:

GP-8F42A91C

The backend uses that token to find the actual gate pass.

Demo passwords are fake (student123 etc.) and are only stored as sha256 hashes.
That is enough for a hackathon — do not add OAuth, JWT, refresh tokens, etc.

16. Demo First

Before adding extra features, make sure this works:

LOGIN
  ↓
STUDENT REQUESTS PASS
  ↓
WARDEN APPROVES
  ↓
QR GENERATED
  ↓
SECURITY SCANS QR
  ↓
PASS VERIFIED
  ↓
ENTRY / EXIT RECORDED

This is our core demo.

If the core demo works, then we can start adding challenge-specific features.

17. When Adding New Features

Before implementing a new feature, think:

What exactly is being requested?
        ↓
What existing page should change?
        ↓
What data do we need?
        ↓
What small backend change is needed?
        ↓
Implement it
        ↓
Test the old flow
        ↓
Test the new flow

Don't add technology just to make the feature sound impressive.

18. Final Rule

Keep it understandable.

If a beginner on our team cannot understand a piece of code after reading it,
consider simplifying it.

The goal is not to build the most technically complicated system.

The goal is to build a working product that we can quickly adapt when the
hackathon challenges change.
