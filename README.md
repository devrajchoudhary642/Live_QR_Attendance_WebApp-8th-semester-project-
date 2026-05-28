# Dynamic QR-Based Attendance System

A MERN stack application where professors display rotating QR codes and students mark attendance by scanning and verifying via a one-time OTP sent to their college email.

## How It Works

1. Professor logs in → creates a session → a QR code is displayed that auto-rotates every 9 seconds.
2. Student scans the QR → enters their email → receives a 6-digit OTP → enters OTP → attendance marked.
3. Each QR token is valid for only 10 seconds (JWT-signed), preventing screenshots from being reused.
4. OTPs are HMAC-SHA256 hashed with a random salt before storage.

---

## Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Gmail account with App Password enabled

---

## Setup

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `OTP_HASH_SECRET` | Long random string for OTP HMAC hashing |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password (see below) |
| `CLIENT_ORIGIN` | Frontend URL (default: http://localhost:5173) |

### 3. Configure Client

```bash
cd client
cp .env.example .env
```

The default `VITE_API_URL=http://localhost:5000` works for local dev.

### 4. Configure Gmail App Password

1. Go to your Google Account → Security → 2-Step Verification (must be enabled).
2. At the bottom, click **App passwords**.
3. Select app: **Mail**, device: **Other** → enter a name → click **Generate**.
4. Copy the 16-character password into `SMTP_PASS` in `server/.env`.

### 5. Seed the professor account

```bash
cd server
npm run seed
```

This creates:
- **Email:** `professor@college.edu`
- **Password:** `Prof@1234`

---

## Running in Development

Open two terminals:

```bash
# Terminal 1 — Backend
cd server
npm run dev
# Runs on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## Usage

1. Open `http://localhost:5173` → redirects to `/login`.
2. Login with professor credentials.
3. Create a session — the QR code is displayed with a rotating countdown.
4. Students scan the QR with their phone camera → opens `/attend?token=...`.
5. Student enters email → receives OTP → enters OTP → attendance recorded.
6. Professor can see real-time attendance count and export CSV.

---

## API Endpoint Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register a new student |
| POST | `/auth/professor-login` | None | Professor login, returns JWT |
| POST | `/auth/send-otp` | None | Send OTP to student email (rate limited: 1/30s per email) |
| POST | `/auth/verify-otp` | None | Verify OTP, mark attendance, return student JWT |
| GET | `/auth/me` | JWT | Get current user profile |

### Session

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/session/create` | Professor JWT | Create new attendance session |
| POST | `/session/refresh-token/:sessionId` | Professor JWT | Generate new QR token (call every 9s) |
| GET | `/session/history` | Professor JWT | All sessions with attendance count |
| GET | `/session/:sessionId/attendance` | Professor JWT | All attendance records for a session |
| GET | `/session/:sessionId/export-csv` | Professor JWT | Download attendance as CSV |
| PATCH | `/session/:sessionId/end` | Professor JWT | Mark session as ended |

### User

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/me` | JWT | Get profile |
| PATCH | `/user/me` | JWT | Update name |

---

## Security Features

- QR tokens are JWTs signed with `JWT_SECRET`, expiring in `QR_TOKEN_TTL_SECONDS` (10s by default).
- OTPs are HMAC-SHA256 hashed with a random 8-byte salt (format: `salt:hash`).
- Global rate limit: 200 requests/minute per IP.
- Per-email OTP throttle: 1 OTP per 30 seconds.
- CORS restricted to `CLIENT_ORIGIN`.
- Professor passwords hashed with bcryptjs (cost factor 12).
- Duplicate attendance rejected with HTTP 409.
- Expired QR token returns HTTP 400 with clear message.

---

## Project Structure

```
project-root/
├── server/
│   ├── config/db.js
│   ├── models/           # User, OtpRecord, Session, AttendanceRecord
│   ├── routes/           # auth, session, attendance, user
│   ├── middleware/        # authMiddleware, rateLimiter
│   ├── utils/            # otpUtils, emailUtils, tokenUtils
│   ├── scripts/seedProfessor.js
│   └── server.js
└── client/
    └── src/
        ├── api/axios.js
        ├── context/AuthContext.jsx
        ├── components/   # QRDisplay, OtpForm, AttendanceTable, Navbar
        └── pages/        # Login, ProfessorDashboard, StudentAttendance, SessionHistory
```
