/**
 * Script to simulate Hikvision terminal HTTP Listening (Webhook) event push
 * Usage:
 *   npx tsx src/scripts/test_webhook_push.ts [target_url]
 *
 * Example:
 *   npx tsx src/scripts/test_webhook_push.ts http://localhost:4000/api/attendance/webhook
 *   npx tsx src/scripts/test_webhook_push.ts https://your-project.vercel.app/api/attendance/webhook
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const targetUrl = process.argv[2] || 'http://localhost:4000/api/attendance/webhook';

const sampleEvent = {
  ipAddress: '192.168.1.100',
  portNo: 80,
  protocol: 'HTTP',
  macAddress: '44:19:b6:aa:bb:cc',
  channelID: 1,
  dateTime: new Date().toISOString(),
  activePostCount: 1,
  eventType: 'AccessControllerEvent',
  eventDescription: 'Access Controller Event',
  AccessControllerEvent: {
    deviceName: 'Hikvision Access Terminal',
    majorEventType: 5,
    subEventType: 75,
    name: 'Test Employee',
    cardNo: '987654321',
    cardType: 1,
    whiteListNo: 0,
    reportChannel: 1,
    cardReaderKind: 1,
    cardReaderNo: 1,
    doorNo: 1,
    verifyNo: 1,
    alarmInNo: 0,
    alarmOutNo: 0,
    caseSensorNo: 0,
    rs485No: 0,
    multiCardGroupNo: 0,
    employeeNoString: '1001',
    serialNo: Math.floor(Date.now() / 1000),
    userType: 'normal',
    currentVerifyMode: 'face',
    time: new Date().toISOString(),
  },
};

console.log(`=======================================================`);
console.log(`Simulating Hikvision HTTP Listening Event Push`);
console.log(`Target URL: ${targetUrl}`);
console.log(`Employee:   ${sampleEvent.AccessControllerEvent.name} (ID: ${sampleEvent.AccessControllerEvent.employeeNoString})`);
console.log(`SerialNo:   ${sampleEvent.AccessControllerEvent.serialNo}`);
console.log(`VerifyMode: ${sampleEvent.AccessControllerEvent.currentVerifyMode}`);
console.log(`=======================================================`);

const postData = JSON.stringify(sampleEvent);
const parsedUrl = new URL(targetUrl);
const isHttps = parsedUrl.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || (isHttps ? 443 : 80),
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Hikvision-Terminal-Simulation/1.0',
  },
};

const req = client.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`\nResponse Status Code: ${res.statusCode}`);
    console.log(`Response Headers:`, res.headers);
    console.log(`Response Body:`, responseData);

    if (res.statusCode === 200) {
      console.log('\n SUCCESS: Webhook accepted and acknowledged the event successfully!');
    } else {
      console.log('\n Webhook returned non-200 status code.');
    }
  });
});

req.on('error', (e) => {
  console.error(`\n Request failed: ${e.message}`);
});

req.write(postData);
req.end();
