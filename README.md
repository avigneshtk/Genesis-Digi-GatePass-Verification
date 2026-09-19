# 🏠 Genesis Digital GatePass Verification

A modern, high-performance **Digital Hostel GatePass Verification System** designed to digitize and streamline the campus gate-pass workflow.

The platform connects **students, wardens, and security personnel** through an intuitive digital lifecycle—replacing paper slips with **secure QR-based verification, instant approvals, and tamper-resistant entry/exit logs**.

---

## 🚀 System Workflow

```text
       ┌───────────────────────────────┐
       │            Student            │
       │   Requests GatePass (Normal   │
       │        or Emergency)          │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │            Warden             │
       │   Reviews details, priority,  │
       │      and Approves / Rejects   │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │       QR Token Issued         │
       │  Unique, time-bound QR token  │
       │     rendered on Dashboard     │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │        Security Gate          │
       │   Camera / Manual QR scan     │
       │  with 3s anti-burst cooldown  │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │      Entry / Exit Logged      │
       │  Pass status updated (OUT /   │
       │  RETURNED) with timestamp     │
       └───────────────────────────────┘
```

---

## ✨ Key Features

### 👨‍🎓 Student Portal
* **Role-Based Authentication**: Fast, secure session login.
* **GatePass Application**: Apply for standard hostel leaves or priority Emergency GatePasses.
* **Detailed Requests**: Specify destination, leaving/returning schedule, and detailed reasons.
* **Real-Time Status Tracking**: Live request status monitoring (`PENDING`, `APPROVED`, `REJECTED`).
* **Instant Digital QR Pass**: Approved passes instantly display dynamic QR codes for gate scanning.
* **Self-Cancellation**: Option to safely cancel pending requests before warden review.

### 👨‍🏫 Warden Portal
* **Centralized Dashboard**: Unified view of all active, pending, and past gate-pass requests.
* **Emergency Priority**: Clear visual indicators for urgent emergency requests.
* **2-Click Quick Action**: Inline confirmation for fast approvals and rejections without disruptive modals.
* **Audit Trail**: Real-time review of student room numbers, leaving windows, and destinations.

### 🛡️ Security Scanner
* **Camera QR Scanner**: High-accuracy camera scanning powered by `html5-qrcode`.
* **Manual Fallback**: Quick manual token entry for low-light or damaged screens.
* **3-Second Anti-Burst Cooldown**: Intelligent frontend scan cooldown with a live countdown timer (`Scanner ready in 3s -> 2s -> 1s -> Ready to Scan`) preventing duplicate accidental scans.
* **One-Click State Machine**: Streamlined movement recording:
  * `APPROVED` ➔ Mark **OUT** (Student departs campus)
  * `OUT` ➔ Mark **RETURNED** (Student returns to hostel)
* **Expired Pass Detection**: Automatic validation against pass schedule to prevent overdue departures.
* **Recent Activity Feed**: Real-time log displaying recent entries and exits at the gate.

---

## 🔑 Demo Accounts

The database comes pre-seeded with sample accounts for all three roles:

| Role | Login ID | Password | Name | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `STU001` | `student123` | Rahul | Room B-204 |
| **Student** | `STU002` | `student123` | Priya | Room A-101 |
| **Warden** | `WARDEN01` | `warden123` | Mr. Sharma | Hostel Supervisor |
| **Security** | `SEC01` | `security123` | Gate Security | Main Gate Terminal |

---

## ⚡ Performance & Engineering Highlights

* **Sub-Second LCP (< 0.5s)**: Non-blocking initial view render with high-priority image preloading (`fetchpriority="high"`), ensuring the landing page paints instantaneously.
* **Code-Splitting with Lazy Loading**: Role dashboards are code-split using `React.lazy()` and `Suspense`, trimming the initial JavaScript payload by over 60% (~71 KB gzip).
* **High-Efficiency Database Access**:
  * Single-query SQL joins for session validation and pass retrieval, completely eliminating N+1 query loops.
  * Explicit indexes on `studentId`, `status`, `qrToken`, and gate logs for microsecond lookup latency.
* **In-Flight Auth Request Deduplication**: Shared promise caching eliminates duplicate `/auth/me` network requests on application initialization.
* **Zero External Native Dependencies**: Built on pure Node.js APIs and modern web standards.

---

## 🛠️ Technology Stack

### Frontend
* **React 19**
* **Vite 8**
* **CSS3** (Responsive design, custom mobile-first layout)
* **html5-qrcode** (Camera-based QR scanning)

### Backend
* **Node.js 20+**
* **Express.js 5**
* **qrcode** (Server-side QR generation)
* **Session Auth** (Secure bearer token sessions)

### Database
* **libSQL / SQLite** (`@libsql/client`)
* Works completely offline with zero setup via local SQLite file (`data/gatepass.db`).
* Cloud-ready: Seamlessly connects to **Turso** cloud libSQL in production.

---

## 📂 Project Structure

```text
Genesis-Digi-GatePass-Verification/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentication & session endpoints
│   │   ├── gatepass.js      # GatePass creation, approvals, & listing
│   │   └── security.js      # QR validation & gate entry/exit logging
│   ├── database.js          # SQLite connection, migrations, & demo seed
│   ├── server.js            # Express application entry point
│   └── session.js           # Session token verification & RBAC middleware
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx            # Multi-role authentication form
│   │   │   ├── Navbar.jsx           # Global navigation & session status
│   │   │   ├── SecurityScanner.jsx  # QR camera scanner & cooldown timer
│   │   │   ├── StudentDashboard.jsx # Pass application & QR display
│   │   │   └── WardenDashboard.jsx  # Review queue & approval controls
│   │   ├── App.jsx          # Root component with lazy-loaded dashboards
│   │   ├── api.js           # API client with request deduplication
│   │   └── main.jsx         # React application entry
│   ├── public/
│   │   └── campus.jpg       # High-priority landing background
│   └── index.html           # HTML template with asset preloading
├── data/                    # Local SQLite storage directory
├── package.json
├── vite.config.mjs
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

* **Node.js**: v20 or later
* **npm**: v9 or later
* A modern web browser (Chrome, Firefox, Safari, Edge)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/josbinjoshy/Genesis-Digi-GatePass-Verification.git
   cd Genesis-Digi-GatePass-Verification
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Backend Server**:
   ```bash
   npm start
   ```
   *The backend starts at `http://localhost:3000` and automatically initializes the local SQLite database.*

4. **Start the Frontend Development Server** (in a separate terminal):
   ```bash
   npm run dev
   ```
   *The Vite frontend starts at `http://localhost:5173` with automatic API proxying.*

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🌐 Cloud Deployment

The application is structured for independent hosting across modern cloud providers:

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Frontend    │ ───►  │     Backend     │ ───►  │     Database    │
│     (Vercel)    │       │ (Render/Railway)│       │ (Turso libSQL)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 1. Database (Turso libSQL)
1. Create a free database at [turso.tech](https://turso.tech).
2. Retrieve your database URL (`libsql://...`) and auth token.

### 2. Backend (Render / Railway)
1. Create a new **Web Service** connected to your repository.
2. Build command: `npm install`
3. Start command: `npm start`
4. Set Environment Variables:
   * `TURSO_DATABASE_URL`: Your Turso connection URL.
   * `TURSO_AUTH_TOKEN`: Your Turso authentication token.
   * `FRONTEND_URL`: Your deployed frontend URL.

### 3. Frontend (Vercel)
1. Import repository in [Vercel](https://vercel.com).
2. Configure build settings:
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. Set your backend URL using `vercel.json` rewrites or via the in-app **Configure API** tool on the login screen.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](LICENSE) file for details.
