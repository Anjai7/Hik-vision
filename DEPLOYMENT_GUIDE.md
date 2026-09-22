# Hikvision Attendance System - Vercel & Supabase Setup Guide

This guide walks you through deploying your Hikvision Attendance System to **Vercel** with a **Supabase PostgreSQL** database, and configuring your Hikvision terminal's **HTTP Listening** feature to push attendance punches in real-time.

---

## Architecture Summary

- **Hikvision Terminal**: Pushes access/attendance events via outbound HTTPS POST to your Vercel webhook whenever an employee checks in (Face, Card, or Fingerprint).
- **Vercel**: Hosts the React dashboard (`frontend/dist`) and executes the serverless backend (`/api/*`).
- **Supabase**: Cloud-hosted PostgreSQL database storing registered users, devices, and attendance logs.

---

## Step 1: Set Up Supabase (Database)

1. Go to [database.new](https://database.new) and sign in or create a free **Supabase** account.
2. Click **New project**:
   - **Name**: `hikvision-attendance` (or any name)
   - **Database Password**: Choose a strong password and save it.
   - **Region**: Choose the region closest to your office/terminal.
3. Once the database finishes provisioning (about 1-2 minutes):
   - Go to **Project Settings** (gear icon) ➔ **Database**.
   - Scroll down to the **Connection string** section.
4. Select the **URI** tab:
   - **Transaction Pooler (for Vercel Serverless)**:
     - Select **Mode: Transaction** and port **6543**.
     - Copy the URI. It looks like:
       ```
       postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
       ```
     - Replace `[YOUR-PASSWORD]` with your real database password. This is your `DATABASE_URL`.
   - **Session / Direct Connection (for Migrations)**:
     - Select **Mode: Session** or standard connection (port **5432**).
     - Copy this URI. This is your `DIRECT_URL`:
       ```
       postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
       ```

5. **Push Database Schema to Supabase**:
   In your local project terminal, run:
   ```bash
   # In the backend directory or root:
   cd backend
   npx prisma db push
   ```
   *(Ensure you have set `DATABASE_URL` and `DIRECT_URL` in `backend/.env` with your Supabase credentials before running this command).*

   You can now open the **Table Editor** in Supabase and you will see the tables: `devices`, `users`, `attendance_events`, and `sync_states`.

---

## Step 2: Deploy to Vercel

1. Push this repository to **GitHub** (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) and click **Add New... ➔ Project**.
3. Import your GitHub repository.
4. In the project configuration:
   - **Framework Preset**: Vite (or Other)
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `frontend/dist`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler |
   | `DIRECT_URL` | `postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:5432/postgres` | Supabase Direct Connection |
   | `NODE_ENV` | `production` | Production mode |
   | `CORS_ORIGIN` | `*` | Or your custom domain |
   | `HIKVISION_HOST` | `https://192.168.1.100` | Fallback device identifier |

6. Click **Deploy**.
7. Once deployed, Vercel will give you a live production URL, e.g.:
   `https://hikvision-attendance.vercel.app`

---

## Step 3: Configure the Hikvision Terminal (HTTP Listening)

Open your Hikvision terminal's Web GUI (by typing its local IP in your browser, e.g. `https://192.168.1.x`):

1. Navigate to:
   **Configuration** ➔ **Network** ➔ **Advanced Settings** ➔ **HTTP Listening** (or **Alarm Server**).
2. Enter the following parameters:

   | Setting | Value to Enter | Notes |
   | :--- | :--- | :--- |
   | **HTTP** | `Enable` | (Toggle ON) |
   | **HTTPS** | `Enable` | (Toggle ON) |
   | **Event Alarm IP/Domain Name** | `hikvision-attendance.vercel.app` | **Your Vercel domain** *(Do not prefix with `https://`)* |
   | **URL** | `/api/attendance/webhook` | Webhook receiver path |
   | **Port** | `443` | Standard HTTPS port |
   | **Protocol** | Select **HTTPS** (radio button) | Encrypted transport |

3. Click **Save**.

4. *(Recommended Check)*:
   Navigate to **System** ➔ **Event Linkage** or **Access Control Settings** on the terminal and make sure **"Notify Surveillance Center"** / **"Upload to Center"** is checked for attendance / authentication events.

---

## Step 4: Test & Verify

### A. Test with the Simulation Script
You can test your deployed Vercel webhook immediately without waiting for a physical badge swipe:

```bash
# Test against your live Vercel deployment:
cd backend
npx tsx src/scripts/test_webhook_push.ts https://your-project.vercel.app/api/attendance/webhook
```

You should see:
```text
Response Status Code: 200
Response Body: {"statusCode":1,"statusString":"OK","processedCount":1}
SUCCESS: Webhook accepted and acknowledged the event successfully!
```

### B. Live Badge / Face Scan Verification
1. Open your Vercel Dashboard in your browser (`https://your-project.vercel.app`).
2. Have someone swipe their card or scan their face at the Hikvision terminal.
3. The terminal pushes the punch to `/api/attendance/webhook`.
4. Refresh or view the Attendance log on your dashboard: the record appears with timestamp, employee ID, and verification mode!
