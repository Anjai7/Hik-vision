import { HikvisionClient } from './HikvisionClient';
import { DeviceInfoResponse } from './types';

export interface ParsedDeviceInfo {
  deviceName: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  macAddress?: string;
  deviceType?: string;
  raw: unknown;
}

export class HikvisionDevice {
  constructor(private client: HikvisionClient) {}

  /**
   * Fetch device information from /ISAPI/System/deviceInfo
   */
  public async getDeviceInfo(): Promise<ParsedDeviceInfo> {
    const raw = await this.client.get<any>('/ISAPI/System/deviceInfo?format=json');

    // Handle XML string response fallback if device returns XML
    if (typeof raw === 'string') {
      return this.parseXmlDeviceInfo(raw);
    }

    const info = raw.DeviceInfo || raw;
    return {
      deviceName: info.deviceName || 'Hikvision Access Terminal',
      model: info.model || 'Unknown Model',
      serialNumber: info.serialNumber || 'Unknown Serial',
      firmwareVersion: info.firmwareVersion
        ? `${info.firmwareVersion} ${info.firmwareReleasedDate || ''}`.trim()
        : 'Unknown Firmware',
      macAddress: info.macAddress,
      deviceType: info.deviceType,
      raw,
    };
  }

  private parseXmlDeviceInfo(xml: string): ParsedDeviceInfo {
    const extract = (tag: string): string => {
      const match = new RegExp(`<${tag}>([^<]+)<\/${tag}>`, 'i').exec(xml);
      return match ? match[1].trim() : '';
    };

    return {
      deviceName: extract('deviceName') || 'Hikvision Access Terminal',
      model: extract('model') || 'Unknown Model',
      serialNumber: extract('serialNumber') || 'Unknown Serial',
      firmwareVersion: `${extract('firmwareVersion')} ${extract('firmwareReleasedDate')}`.trim() || 'Unknown Firmware',
      macAddress: extract('macAddress') || undefined,
      deviceType: extract('deviceType') || undefined,
      raw: { xml },
    };
  }
}
