# Manual Verification & Testing Guide

This guide walks through testing and verifying the Hikvision DS-K1T320MFWX Attendance Management System step by step.

---

## Pre-Requisites

1. Terminal IP: `192.168.18.229` (reachable on local LAN/Wi-Fi).
2. Configure credentials in `backend/.env`:
   ```env
   HIKVISION_HOST=https://192.168.18.229
   HIKVISION_USERNAME=admin
   HIKVISION_PASSWORD=YOUR_ACTUAL_PASSWORD
   HIKVISION_VERIFY_TLS=false
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/hikvision_attendance?schema=public
   ```
3. Ensure PostgreSQL is running (`docker compose up -d`).

---

## 9-Step Verification Checklist

### 1. Test Device Connection
Run the automated live check script:
```powershell
cd backend
npx tsx src/scripts/testDeviceLive.ts
```
Expected output:
- Successful TCP/TLS handshake over HTTPS.
- 401 challenge intercepted and Digest Authentication computed.

### 2. Test Device Info
The script calls `GET /ISAPI/System/deviceInfo?format=json`.
Verify returned parameters:
- Model: `DS-K1T320MFWX`
- Firmware: `V3.5.2 build 240701`
- Serial number is received.

### 3. Test User Count
The script calls `GET /ISAPI/AccessControl/UserInfo/Count?format=json`.
Verify count:
- `userNumber`: 1 (or current registered count)
- `bindFingerprintUserNumber`: 1
- `bindFaceUserNumber`: 0
- `bindCardUserNumber`: 0

### 4. Test User Search
The script calls `POST /ISAPI/AccessControl/UserInfo/Search?format=json`.
Verify user record:
- EmployeeNo: `1`
- Name: `Anjai`
- Biometrics: 1 Fingerprint

### 5. Test Event Search
The script calls `POST /ISAPI/AccessControl/AcsEvent?format=json`.
Verify authenticated event:
- Major: `5`
- Minor: `38`
- Name: `Anjai`
- Verify Mode: `faceOrFpOrCardOrPw`

### 6. Test Synchronize Users via REST API
Start the backend server:
```powershell
npm run dev
```
In another terminal, trigger the sync endpoint:
```powershell
curl -X POST http://localhost:4000/api/users/sync
```
Expected Response:
```json
{
  "success": true,
  "data": {
    "count": 1,
    "durationMs": 142
  }
}
```

### 7. Test Synchronize Events via REST API
Trigger the attendance event sync:
```powershell
curl -X POST http://localhost:4000/api/attendance/sync
```
Expected Response:
```json
{
  "success": true,
  "data": {
    "count": 21,
    "durationMs": 350
  }
}
```
Run it a second time to verify **duplicate prevention**:
The count should be `0` new events because existing events are deduplicated by composite key `(deviceId, serialNo, eventTime, employeeNo)`.

### 8. View Users in Dashboard UI
1. Start frontend:
   ```powershell
   cd frontend
   npm run dev
   ```
2. Open `http://localhost:5173` in browser.
3. Click **Users** on the sidebar navigation.
4. Verify:
   - Employee `1 - Anjai` is displayed.
   - Fingerprint badge shows `1 Enrolled`.
   - Search bar works for "Anjai" or "1".
   - Biometric filter works.

### 9. View Events in Dashboard UI
1. Click **Attendance Logs** on the sidebar.
2. Verify:
   - Events are listed with Date, Time, Employee ID, Name, Event Description, and Verification Mode.
   - Descriptions are neutral (e.g. `Authentication Passed / Access Granted`).
   - Click the **JSON** button on any row:
   - Verify modal opens showing the exact raw ISAPI JSON event returned by the terminal.
