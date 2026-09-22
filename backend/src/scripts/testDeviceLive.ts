/**
 * Standalone Manual Verification Script for Hikvision DS-K1T320MFWX ISAPI
 * 
 * Usage:
 *   npx tsx src/scripts/testDeviceLive.ts
 * 
 * Tests the exact sequence:
 * 1. Device connection & deviceInfo
 * 2. User count (/ISAPI/AccessControl/UserInfo/Count)
 * 3. User search (/ISAPI/AccessControl/UserInfo/Search)
 * 4. Attendance event search (/ISAPI/AccessControl/AcsEvent)
 */

import { HikvisionClient } from '../hikvision/HikvisionClient';
import { HikvisionDevice } from '../hikvision/HikvisionDevice';
import { HikvisionUsers } from '../hikvision/HikvisionUsers';
import { HikvisionEvents } from '../hikvision/HikvisionEvents';
import { config } from '../config';

async function runLiveVerification() {
  console.log('===============================================================');
  console.log(' Hikvision DS-K1T320MFWX Live ISAPI Verification Script');
  console.log(` Target Host : ${config.HIKVISION_HOST}`);
  console.log(` Username    : ${config.HIKVISION_USERNAME}`);
  console.log(` Verify TLS  : ${config.HIKVISION_VERIFY_TLS}`);
  console.log(` Timeout     : ${config.HIKVISION_TIMEOUT}ms`);
  console.log('===============================================================\n');

  const client = new HikvisionClient({
    host: config.HIKVISION_HOST,
    username: config.HIKVISION_USERNAME,
    password: config.HIKVISION_PASSWORD,
    verifyTls: config.HIKVISION_VERIFY_TLS,
    timeoutMs: config.HIKVISION_TIMEOUT,
  });

  const deviceService = new HikvisionDevice(client);
  const usersService = new HikvisionUsers(client);
  const eventsService = new HikvisionEvents(client);

  try {
    // 1. Device Info
    console.log('[Step 1/4] Fetching Device Info (GET /ISAPI/System/deviceInfo)...');
    const start1 = Date.now();
    const deviceInfo = await deviceService.getDeviceInfo();
    console.log(`✓ Device Info received in ${Date.now() - start1}ms:`);
    console.log(`  - Model           : ${deviceInfo.model}`);
    console.log(`  - Firmware        : ${deviceInfo.firmwareVersion}`);
    console.log(`  - Serial Number   : ${deviceInfo.serialNumber}`);
    console.log(`  - Device Name     : ${deviceInfo.deviceName}\n`);

    // 2. User Count
    console.log('[Step 2/4] Fetching User Count (GET /ISAPI/AccessControl/UserInfo/Count)...');
    const start2 = Date.now();
    const userCount = await usersService.getUserCount();
    console.log(`✓ User Count received in ${Date.now() - start2}ms:`);
    console.log(`  - Total Users     : ${userCount.userNumber}`);
    console.log(`  - Fingerprint Users: ${userCount.bindFingerprintUserNumber}`);
    console.log(`  - Face Users      : ${userCount.bindFaceUserNumber}`);
    console.log(`  - Card Users      : ${userCount.bindCardUserNumber}\n`);

    // 3. User Search
    console.log('[Step 3/4] Searching Users (POST /ISAPI/AccessControl/UserInfo/Search)...');
    const start3 = Date.now();
    const userSearch = await usersService.searchUsers({ position: 0, maxResults: 10 });
    console.log(`✓ Users Search received in ${Date.now() - start3}ms:`);
    console.log(`  - Total Matches   : ${userSearch.totalMatches}`);
    console.log(`  - Returned in Page: ${userSearch.numOfMatches}`);
    userSearch.users.forEach((u, i) => {
      console.log(`    [${i + 1}] EmployeeNo: ${u.employeeNo}, Name: ${u.name}, FP: ${u.numOfFP || 0}, Face: ${u.numOfFace || 0}, Card: ${u.numOfCard || 0}`);
    });
    console.log('');

    // 4. Event Search
    console.log('[Step 4/4] Searching Attendance Events (POST /ISAPI/AccessControl/AcsEvent)...');
    const start4 = Date.now();
    const eventSearch = await eventsService.searchEvents({ position: 0, maxResults: 5 });
    console.log(`✓ Events Search received in ${Date.now() - start4}ms:`);
    console.log(`  - Total Matches   : ${eventSearch.totalMatches}`);
    console.log(`  - Returned in Page: ${eventSearch.numOfMatches}`);
    eventSearch.events.forEach((ev, i) => {
      console.log(`    [${i + 1}] Time: ${ev.time}, Major: ${ev.major}, Minor: ${ev.minor}, EmpNo: ${ev.employeeNoString || 'N/A'}, Name: ${ev.name || 'Unknown'}, Mode: ${ev.currentVerifyMode || 'N/A'}`);
    });

    console.log('\n===============================================================');
    console.log(' All ISAPI endpoint checks completed successfully!');
    console.log('===============================================================');
  } catch (error: any) {
    console.error('\n❌ ISAPI Verification failed with error:', error.message);
    if (error.code) console.error(`   Error Code: ${error.code}`);
    if (error.statusCode) console.error(`   HTTP Status: ${error.statusCode}`);
    if (error.details) console.error(`   Details: ${JSON.stringify(error.details, null, 2)}`);
    process.exit(1);
  }
}

runLiveVerification();
