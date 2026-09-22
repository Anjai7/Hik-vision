/**
 * Complete HTTP/ISAPI Endpoint Definitions for Hikvision Terminal (DS-K1T320MFWX)
 * Target Device IP: 192.168.18.229
 */

export const HIKVISION_ENDPOINTS = {
  // System Management
  SYSTEM: {
    DEVICE_INFO: '/ISAPI/System/deviceInfo?format=json',
    CAPABILITIES: '/ISAPI/System/capabilities',
    STATUS: '/ISAPI/System/status',
    TIME: '/ISAPI/System/time',
    NTP: '/ISAPI/System/time/ntpServers',
    REBOOT: '/ISAPI/System/reboot',
  },

  // Network Configuration
  NETWORK: {
    INTERFACES: '/ISAPI/System/Network/interfaces',
    WIFI: '/ISAPI/System/Network/wifi',
    WIFI_SCAN: '/ISAPI/System/Network/wifi/wifiNetworks',
  },

  // Access Control & Hardware Telemetry
  ACCESS_CONTROL: {
    CAPABILITIES: '/ISAPI/AccessControl/capabilities',
    WORK_STATUS: '/ISAPI/AccessControl/AcsWorkStatus?format=json',
    DOOR_CAPABILITIES: '/ISAPI/AccessControl/Door/capabilities',
    /**
     * Remote Door Control
     * @param doorId Door channel ID (usually 1)
     * Payload: <RemoteControlDoor><cmd>open|close|alwaysOpen|alwaysClose</cmd></RemoteControlDoor>
     */
    REMOTE_CONTROL_DOOR: (doorId = 1) => `/ISAPI/AccessControl/RemoteControl/door/${doorId}`,
  },

  // User / Employee Management
  USER: {
    CAPABILITIES: '/ISAPI/AccessControl/UserInfo/capabilities?format=json',
    COUNT: '/ISAPI/AccessControl/UserInfo/Count?format=json',
    SEARCH: '/ISAPI/AccessControl/UserInfo/Search?format=json',
    RECORD: '/ISAPI/AccessControl/UserInfo/Record?format=json',
    SETUP: '/ISAPI/AccessControl/UserInfo/SetUp?format=json',
    MODIFY: '/ISAPI/AccessControl/UserInfo/Modify?format=json',
    DELETE: '/ISAPI/AccessControl/UserInfo/Delete?format=json',
  },

  // Card Credentials
  CARD: {
    CAPABILITIES: '/ISAPI/AccessControl/CardInfo/capabilities',
    COUNT: '/ISAPI/AccessControl/CardInfo/Count?format=json',
    SEARCH: '/ISAPI/AccessControl/CardInfo/Search?format=json',
    RECORD: '/ISAPI/AccessControl/CardInfo/Record?format=json',
    SETUP: '/ISAPI/AccessControl/CardInfo/SetUp?format=json',
    DELETE: '/ISAPI/AccessControl/CardInfo/Delete?format=json',
    CAPTURE_CARD: '/ISAPI/AccessControl/CaptureCardInfo',
  },

  // Facial Biometrics & Recognition
  FACE: {
    LIBRARIES: '/ISAPI/Intelligent/FDLib?format=json',
    SEARCH: '/ISAPI/Intelligent/FDLib/FDSearch?format=json',
    SETUP: '/ISAPI/Intelligent/FDLib/FDSetUp?format=json',
    CAPTURE_DATA: '/ISAPI/AccessControl/CaptureFaceData',
  },

  // Fingerprint Scanner
  FINGERPRINT: {
    CAPABILITIES: '/ISAPI/AccessControl/FingerPrint/capabilities',
    COUNT: '/ISAPI/AccessControl/FingerPrint/Count?format=json',
    CAPTURE: '/ISAPI/AccessControl/CaptureFingerPrint',
  },

  // Attendance and Access Event Logs
  EVENTS: {
    CAPABILITIES: '/ISAPI/AccessControl/AcsEvent/capabilities?format=json',
    SEARCH: '/ISAPI/AccessControl/AcsEvent?format=json',
  },

  // Real-Time Push & Streaming
  NOTIFICATIONS: {
    HTTP_HOSTS: '/ISAPI/Event/notification/httpHosts',
    HTTP_HOSTS_CAP: '/ISAPI/Event/notification/httpHosts/capabilities',
    ALERT_STREAM: '/ISAPI/Event/notification/alertStream',
  },

  // Live Camera Streaming
  STREAMING: {
    CHANNELS: '/ISAPI/Streaming/channels',
    RTSP_URL: (user: string, pass: string, host: string, stream = 101) =>
      `rtsp://${user}:${pass}@${host}:554/Streaming/Channels/${stream}`,
  },

  // Device Administration Users
  SECURITY: {
    USERS: '/ISAPI/Security/users',
    CAPABILITIES: '/ISAPI/Security/capabilities',
  },
} as const;
