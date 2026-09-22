import { describe, it, expect } from 'vitest';
import { HikvisionDevice } from '../src/hikvision/HikvisionDevice';
import { HikvisionUsers } from '../src/hikvision/HikvisionUsers';
import { HikvisionEvents } from '../src/hikvision/HikvisionEvents';
import { getNeutralEventDescription } from '../src/hikvision/eventMappings';

describe('Hikvision Response Parsers & Event Mappings', () => {
  it('should parse device information JSON response', async () => {
    const mockClient: any = {
      get: async () => ({
        DeviceInfo: {
          deviceName: 'Entrance Terminal',
          model: 'DS-K1T320MFWX',
          serialNumber: 'DS-K1T320MFWX20240701V030502',
          firmwareVersion: 'V3.5.2',
          firmwareReleasedDate: 'build 240701',
          macAddress: 'c8:02:8f:12:34:56',
        },
      }),
    };

    const device = new HikvisionDevice(mockClient);
    const parsed = await device.getDeviceInfo();

    expect(parsed.model).toBe('DS-K1T320MFWX');
    expect(parsed.firmwareVersion).toBe('V3.5.2 build 240701');
    expect(parsed.serialNumber).toBe('DS-K1T320MFWX20240701V030502');
    expect(parsed.macAddress).toBe('c8:02:8f:12:34:56');
  });

  it('should parse device information XML response fallback', async () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<DeviceInfo version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
  <deviceName>Access Control</deviceName>
  <model>DS-K1T320MFWX</model>
  <serialNumber>DS-K1T320MFWX-TEST</serialNumber>
  <macAddress>00:11:22:33:44:55</macAddress>
  <firmwareVersion>V3.5.2</firmwareVersion>
  <firmwareReleasedDate>build 240701</firmwareReleasedDate>
</DeviceInfo>`;

    const mockClient: any = {
      get: async () => xmlData,
    };

    const device = new HikvisionDevice(mockClient);
    const parsed = await device.getDeviceInfo();

    expect(parsed.model).toBe('DS-K1T320MFWX');
    expect(parsed.firmwareVersion).toBe('V3.5.2 build 240701');
    expect(parsed.serialNumber).toBe('DS-K1T320MFWX-TEST');
  });

  it('should parse user count response', async () => {
    const mockClient: any = {
      get: async () => ({
        userNumber: 1,
        bindFingerprintUserNumber: 1,
        bindFaceUserNumber: 0,
        bindCardUserNumber: 0,
      }),
    };

    const users = new HikvisionUsers(mockClient);
    const count = await users.getUserCount();

    expect(count.userNumber).toBe(1);
    expect(count.bindFingerprintUserNumber).toBe(1);
    expect(count.bindFaceUserNumber).toBe(0);
    expect(count.bindCardUserNumber).toBe(0);
  });

  it('should parse UserInfo search response matching terminal structure', async () => {
    const mockClient: any = {
      post: async () => ({
        UserInfoSearch: {
          searchID: '1',
          responseStatusStrg: 'OK',
          numOfMatches: 1,
          totalMatches: 1,
          UserInfo: [
            {
              employeeNo: '1',
              name: 'Anjai',
              userType: 'normal',
              numOfCard: 0,
              numOfFP: 1,
              numOfFace: 0,
            },
          ],
        },
      }),
    };

    const users = new HikvisionUsers(mockClient);
    const result = await users.searchUsers({ position: 0, maxResults: 30 });

    expect(result.totalMatches).toBe(1);
    expect(result.numOfMatches).toBe(1);
    expect(result.users).toHaveLength(1);
    expect(result.users[0].employeeNo).toBe('1');
    expect(result.users[0].name).toBe('Anjai');
    expect(result.users[0].numOfFP).toBe(1);
  });

  it('should parse AcsEvent authenticated event structure', async () => {
    const sampleEvent = {
      major: 5,
      minor: 38,
      time: '2026-09-21T22:40:13+08:00',
      cardType: 1,
      name: 'Anjai',
      cardReaderNo: 1,
      doorNo: 1,
      employeeNoString: '1',
      userType: 'normal',
      currentVerifyMode: 'faceOrFpOrCardOrPw',
      serialNo: 42,
    };

    const mockClient: any = {
      post: async () => ({
        AcsEvent: {
          searchID: '1',
          responseStatusStrg: 'OK',
          numOfMatches: 1,
          totalMatches: 21,
          InfoList: [sampleEvent],
        },
      }),
    };

    const events = new HikvisionEvents(mockClient);
    const result = await events.searchEvents({ position: 0, maxResults: 30 });

    expect(result.totalMatches).toBe(21);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Anjai');
    expect(result.events[0].employeeNoString).toBe('1');
    expect(result.events[0].major).toBe(5);
    expect(result.events[0].minor).toBe(38);
  });

  it('should return neutral event description without assuming IN/OUT semantics', () => {
    const desc = getNeutralEventDescription(5, 38, 'faceOrFpOrCardOrPw');

    expect(desc.description).toBe('Authentication Passed / Access Granted');
    expect(desc.category).toBe('Access Control');
    expect(desc.verifyModeLabel).toBe('Face / Fingerprint / Card / Password');
    // Ensure "Check In" or "Check Out" are NOT emitted
    expect(desc.description.toLowerCase()).not.toContain('check in');
    expect(desc.description.toLowerCase()).not.toContain('check out');
  });

  it('should format unknown major/minor combinations as neutral raw event', () => {
    const desc = getNeutralEventDescription(99, 999);

    expect(desc.description).toBe('Raw Event (Major: 99, Minor: 999)');
    expect(desc.codeDisplay).toBe('[99, 999]');
  });
});
