# Hikvision ISAPI Attendance Management System

A standalone attendance management application for the **Hikvision DS-K1T320MFWX** access control & time attendance terminal (Firmware `V3.5.2 build 240701`).

Built with a decoupled **Node.js/TypeScript** backend and a modern **React/TypeScript/Vite** admin dashboard.

---

## Architecture Overview

```
+---------------------------+
|      React Frontend       |  (Modern Dashboard, Vite, TypeScript)
|   http://localhost:5173   |
+---------------------------+
              |
              | REST API (/api)
              v
+---------------------------+
|    Node.js / Express      |  (TypeScript, Security, Rate Limiting)
|   http://localhost:4000   |
+-------------+-------------+
              |
      +-------+-------+
      |               |
      v               v
+------------+  +----------------------------------+
| PostgreSQL |  |   Hikvision ISAPI Client         |
| (Prisma)   |  |   - HTTPS (TLS 1.2/1.3)          |
+------------+  |   - HTTP Digest Auth (RFC 2617)  |
                |   - DS-K1T320MFWX (192.168.18.229)|
                +----------------------------------+
```

> [!NOTE]
> The frontend communicates **only** with the Node.js REST API. It never contacts the Hikvision terminal directly, preserving device security and credentials.

---

## 1. System Requirements

- **Node.js**: v18+ (tested on v22.22.3)
- **npm**: v9+ (tested on v10.9.8)
- **PostgreSQL**: v14+ (or Docker)
- **Hikvision Terminal**: DS-K1T320MFWX connected to LAN/Wi-Fi

---

## 2. Environment Configuration

Copy `.env.example` in `backend/`:
```powershell
cp backend/.env.example backend/.env
```

Configure `backend/.env`:
```env
# Hikvision Terminal ISAPI Settings
HIKVISION_HOST=https://192.168.18.229
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=YOUR_TERMINAL_PASSWORD
HIKVISION_VERIFY_TLS=false
HIKVISION_TIMEOUT=10000

# PostgreSQL Database Connection URL
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/hikvision_attendance?schema=public

# Server Configuration
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

> [!SECURITY]
> `backend/.env` is ignored by git. Never commit plain-text credentials.

---

## 3. Database Setup

### Option A: Using Docker (Recommended)
Run PostgreSQL and Adminer using the root `docker-compose.yml`:
```powershell
docker compose up -d
```
- PostgreSQL: `localhost:5432`
- Adminer Database UI: `http://localhost:8080`

### Option B: Using Existing PostgreSQL
Ensure your database exists and update `DATABASE_URL` in `backend/.env`.

### Initialize Schema & Migrations
```powershell
cd backend
npx prisma db push
```

---

## 4. Running the Application

### Start Backend Dev Server
```powershell
cd backend
npm install
npm run dev
```
Backend will start on `http://localhost:4000`.

### Start Frontend Dev Server
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 5. Running Automated Tests

Run the full Vitest suite in the backend:
```powershell
cd backend
npm test
```

Tests cover:
- RFC 2617 / RFC 7616 Digest Authentication header generation and MD5 computation
- Device info parsing (JSON and XML fallback)
- User count and user search parsing
- Event search parsing and neutral event mapping
- Multi-page pagination (`searchResultPosition`, `maxResults`)
- Event deduplication strategy using composite key `(deviceId, serialNo, eventTime, employeeNo)`
- Zod API validation schemas

---

## 6. Live Hardware Verification

To test the physical terminal directly from your machine:
```powershell
cd backend
npx tsx src/scripts/testDeviceLive.ts
```

This verifies the 4 key ISAPI endpoints sequentially:
1. `GET /ISAPI/System/deviceInfo?format=json`
2. `GET /ISAPI/AccessControl/UserInfo/Count?format=json`
3. `POST /ISAPI/AccessControl/UserInfo/Search?format=json`
4. `POST /ISAPI/AccessControl/AcsEvent?format=json`

See [manual_test_guide.md](manual_test_guide.md) for full step-by-step instructions.

---

## 7. REST API Endpoints

### Device
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/device` | Stored device record & connection settings |
| `GET` | `/api/device/status` | Live ping & hardware status |
| `POST` | `/api/device/test` | Connection test with latency measurement |
| `POST` | `/api/device/sync` | Trigger full sync (users + events) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List users with pagination and search |
| `GET` | `/api/users/:employeeNo` | Single user details |
| `POST` | `/api/users/sync` | Synchronize users from terminal |
| `POST` | `/api/users` | *Unverified* - returns 501 |
| `PUT` | `/api/users/:employeeNo` | *Unverified* - returns 501 |
| `DELETE` | `/api/users/:employeeNo` | *Unverified* - returns 501 |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/attendance` | Filterable attendance logs (`from`, `to`, `employeeNo`, `search`, `verificationMode`) |
| `GET` | `/api/attendance/:id` | Event record with raw ISAPI JSON |
| `POST` | `/api/attendance/sync` | Synchronize events from terminal |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Aggregated user stats, event metrics, recent activity |

---

## 8. Verified ISAPI Endpoints & Event Semantics

### Neutral Event Mapping
Per instructions, events are **not** guessed as "Check In" or "Check Out":
- Major `5`, Minor `38`: `Authentication Passed / Access Granted`
- Major `5`, Minor `39`: `Authentication Failed / Access Denied`
- Verification mode `faceOrFpOrCardOrPw`: `Face / Fingerprint / Card / Password`
- All raw ISAPI JSON payloads are preserved in the `rawEvent` column and viewable in the UI.

### Unverified Endpoints Isolated
Writing user biometrics or deleting users directly via ISAPI (`/ISAPI/AccessControl/UserInfo/SetUp` etc.) is isolated in `backend/src/services/UserService.ts` and returns HTTP 501 with clear explanation, preventing unintended device lockouts until write endpoints are validated on hardware.

---

## 9. Next Steps for Integration into Existing Applications

The backend service layer is completely isolated under `backend/src/hikvision/` and `backend/src/services/`:
1. **Reuse Hikvision Client**: Copy `backend/src/hikvision/` into any Node.js/NestJS/Express application. It has zero external framework dependencies (uses standard Node `node:https` / `node:crypto`).
2. **Scheduled Sync**: Add node-cron or BullMQ job to trigger `syncService.syncEvents()` every X minutes.
3. **Attendance Rules Engine**: Once your application defines shift times and geofences, map the neutral events (`eventTime`, `employeeNo`) to your domain's Check-In / Check-Out / Late calculation logic.
