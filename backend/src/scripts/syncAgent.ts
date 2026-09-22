/**
 * Hikvision Local Sync Agent
 *
 * Runs locally on the office network to bridge cloud updates (from Supabase/Vercel)
 * down to the physical Hikvision terminal (DS-K1T320MFWX) via ISAPI.
 *
 * Usage:
 *   npx ts-node src/scripts/syncAgent.ts         (Continuous background sync daemon)
 *   npx ts-node src/scripts/syncAgent.ts --once  (One-time sync check and exit)
 */

import { prisma } from '../db';
import { HikvisionClient } from '../hikvision';
import { HikvisionUsers } from '../hikvision/HikvisionUsers';
import { config } from '../config';

function createClient(): HikvisionClient {
  return new HikvisionClient({
    host: config.HIKVISION_HOST,
    username: config.HIKVISION_USERNAME,
    password: config.HIKVISION_PASSWORD,
    verifyTls: config.HIKVISION_VERIFY_TLS,
    timeoutMs: config.HIKVISION_TIMEOUT,
  });
}

function formatHikvisionDateTime(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`;
}

export async function runSyncCycle(): Promise<{ processed: number; errors: number }> {
  const pendingUsers = await prisma.user.findMany({
    where: { terminalSyncStatus: 'PENDING' },
  });

  if (pendingUsers.length === 0) {
    return { processed: 0, errors: 0 };
  }

  console.log(`[SyncAgent] Found ${pendingUsers.length} user(s) pending sync to terminal.`);
  const client = createClient();
  const hikUsers = new HikvisionUsers(client);

  let processed = 0;
  let errors = 0;

  for (const user of pendingUsers) {
    try {
      const beginTime = formatHikvisionDateTime(user.validFrom, '2020-01-01T00:00:00');
      // If user.enabled is false, force an expired endTime so terminal hardware immediately rejects scans
      const isExpired = user.enabled === false || (user.validTo && new Date(user.validTo) < new Date());
      const endTime = isExpired
        ? '2020-01-02T00:00:00' // Expired date in the past -> terminal locks door!
        : formatHikvisionDateTime(user.validTo, '2035-12-31T23:59:59');

      console.log(`[SyncAgent] Updating terminal for ${user.name} (ID: ${user.employeeNo})...`);
      console.log(`            Begin: ${beginTime} | End: ${endTime} | Enabled: ${user.enabled}`);

      const result = await hikUsers.updateUserValidity(user.employeeNo, {
        beginTime,
        endTime,
        enable: user.enabled,
        name: user.name,
        userType: user.userType,
      });

      console.log(`[SyncAgent] SUCCESS! Terminal accepted update for ID ${user.employeeNo}. Result:`, result);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          terminalSyncStatus: 'SYNCED',
          lastTerminalSyncAt: new Date(),
        },
      });

      processed++;
    } catch (err: any) {
      console.error(`[SyncAgent] ERROR updating ID ${user.employeeNo} on terminal:`, err.message);
      errors++;
    }
  }

  return { processed, errors };
}

async function main() {
  const isOnce = process.argv.includes('--once');
  console.log('=====================================================');
  console.log('       Hikvision Terminal Local Sync Agent           ');
  console.log('=====================================================');
  console.log(`Mode: ${isOnce ? 'One-time execution' : 'Continuous daemon (every 5 seconds)'}`);

  const client = createClient();
  try {
    const info = await client.get<any>('/ISAPI/System/deviceInfo');
    console.log(`[SyncAgent] Connected to terminal: ${info?.DeviceInfo?.deviceName || 'DS-K1T320MFWX'}`);
  } catch (err: any) {
    console.warn(`[SyncAgent] Warning: could not reach terminal at startup: ${err.message}`);
    console.warn(`            Will keep polling in case terminal connects.`);
  }

  if (isOnce) {
    const res = await runSyncCycle();
    console.log(`[SyncAgent] Finished. Processed: ${res.processed}, Errors: ${res.errors}`);
    process.exit(0);
  }

  // Continuous polling loop
  console.log('[SyncAgent] Listening for web portal changes...');
  const poll = async () => {
    try {
      await runSyncCycle();
    } catch (e: any) {
      console.error('[SyncAgent] Error during sync cycle:', e.message);
    }
    setTimeout(poll, 5000);
  };

  poll();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[SyncAgent] Fatal error:', err);
    process.exit(1);
  });
}
