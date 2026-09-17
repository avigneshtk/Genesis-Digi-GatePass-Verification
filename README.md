# 🏠 Genesis Digital GatePass Verification

A **Digital Hostel GatePass Verification System** designed to simplify and digitize the hostel gate-pass process.

The system connects **students, wardens, and security staff** through a simple digital workflow, replacing manual gate-pass verification with **QR-based verification and digital entry/exit records**.

---

## 🚀 Project Overview

The system follows a simple workflow:

```text
Student
   ↓
Request Gate Pass
   ↓
Warden Reviews Request
   ↓
Approve / Reject
   ↓
QR Code Generated
   ↓
Security Scans QR
   ↓
Gate Pass Verified
   ↓
Entry / Exit Recorded
```

The project is designed specifically for a **hackathon environment**, with a focus on simplicity, usability, and easy future modifications.

---

## ✨ Key Features

### 👨‍🎓 Student

* Student login
* Apply for a gate pass
* Enter reason for leaving
* Specify leaving and returning time
* View gate-pass status
* View previous requests
* View approved gate passes
* Display QR code for an approved pass

### 👨‍🏫 Warden

* Warden login
* View pending gate-pass requests
* Review student requests
* Approve gate passes
* Reject gate passes
* View previous requests

### 🛡️ Security

* Security login
* Scan QR codes using a camera
* Manually enter the QR token
* Verify gate-pass validity
* Detect expired passes
* Record student entry
* Record student exit
* View recent gate activity

---

## 🔐 QR-Based Verification

Each approved gate pass receives a unique QR token.

Example:

```text
GP-8F42A91C
```

The QR code contains only the unique token.

When security scans the QR code, the backend uses the token to find the corresponding gate pass and verify its status and validity.

### Valid Pass

```text
✓ VALID PASS

Student: Rahul
Room: B-204
Valid until: 18 September, 8:00 AM

[ RECORD EXIT ]
```

### Invalid / Expired Pass

```text
✕ INVALID PASS

Reason: Pass has expired.
```

Manual token entry is also available as a backup when QR scanning is not possible.

---

## 🛠️ Technology Stack

### Frontend

* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* SQLite
* Node.js built-in `node:sqlite`

### QR Code

* `qrcode` for QR generation
* `html5-qrcode` for QR scanning

---

## 📂 Project Structure

```text
Genesis-Digi-GatePass-Verification/
│
├── backend/
│
├── frontend/
│
├── data/
│
├── package.json
└── README.md
```

> The project structure may evolve as new hackathon requirements are introduced. The goal is to keep the codebase simple and easy to modify.

---

## 🔄 Gate Pass Lifecycle

A gate pass can have one of the following statuses:

```text
PENDING
APPROVED
REJECTED
```

### Pending

The student has submitted a request and is waiting for the warden's decision.

### Approved

The warden has approved the request and a QR code is generated.

### Rejected

The warden has rejected the request.

### Expired

Expired passes are not stored as a separate database status.

Instead, the system checks the current time against the gate pass's return time during verification.

---

## 🗄️ Database

The system uses SQLite as its database.

The database is designed to store information about:

### Users

```text
id
name
email
password
role
studentId
roomNumber
```

### Gate Passes

```text
id
studentId
reason
fromDateTime
toDateTime
status
qrToken
```

### Gate Logs

```text
gatePassId
studentId
action
timestamp
```

Gate actions include:

```text
ENTRY
EXIT
```

---

## 🔒 Security

The project follows basic security practices suitable for a hackathon application.

* Passwords are stored as SHA-256 hashes.
* QR codes contain only a unique token.
* Personal information is not stored inside QR codes.
* API keys and real credentials should never be committed.
* The database should not be committed to Git.
* The backend performs the actual gate-pass verification.

---

## ⚙️ Getting Started

### Prerequisites

Install:

* Node.js 23+
* npm
* A modern web browser

Node.js 23+ is required because the project uses the built-in `node:sqlite` module.

### Installation

Clone the repository:

```bash
git clone https://github.com/josbinjoshy/Genesis-Digi-GatePass-Verification.git
```

Move into the project:

```bash
cd Genesis-Digi-GatePass-Verification
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

Then open the application in your browser.

```text
http://localhost:3000
```

> If the project's start command or port changes during development, update this section accordingly.

---

## 🧪 Main Demo Flow

For the hackathon demonstration:

```text
1. Student logs in
        ↓
2. Student requests a gate pass
        ↓
3. Warden logs in
        ↓
4. Warden approves the request
        ↓
5. QR code is generated
        ↓
6. Security scans the QR
        ↓
7. Backend verifies the pass
        ↓
8. Security records Entry / Exit
        ↓
9. Gate activity is displayed
```

---

## 🎯 Hackathon Philosophy

This project intentionally follows a **simple and flexible architecture**.

The goal is not to build an unnecessarily complicated enterprise system.

Instead, the project focuses on:

```text
Simple
   ↓
Understandable
   ↓
Flexible
   ↓
Easy to Modify
```

This makes it easier to respond to new challenges during the hackathon.

For example, future challenges could introduce:

* Parent approval
* Emergency gate passes
* Attendance tracking
* Notifications
* AI-assisted features
* Analytics
* Admin features

New functionality should be added with the **smallest practical changes** without breaking the existing gate-pass workflow.

---

## 🔮 Future Scope

Possible future improvements include:

* 👨‍👩‍👧 Parent approval
* 🚨 Emergency gate passes
* 📊 Gate-pass analytics
* 📱 Improved mobile experience
* 🔔 In-app notifications
* 🤖 AI-assisted hostel management features
* 📋 Attendance integration
* 🏫 Multi-hostel support
* 📈 Administrative reports

---

## 👥 Team

**Genesis — Digital GatePass Verification System**

Built as a hackathon project to demonstrate a simple digital solution for hostel gate-pass management and verification.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See the [`LICENSE`](LICENSE) file for details.
