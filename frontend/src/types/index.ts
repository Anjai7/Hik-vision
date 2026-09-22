export interface DeviceData {
  id: string;
  name: string;
  host: string;
  username: string;
  model: string;
  firmware: string;
  serialNo: string;
  enabled: boolean;
  lastSeenAt?: string | null;
  lastSyncAt?: string | null;
  connection?: {
    host: string;
    username: string;
    verifyTls?: boolean;
    timeoutMs?: number;
  };
}

export interface UserData {
  id: string;
  employeeNo: string;
  name: string;
  userType: string;
  enabled: boolean;
  gender?: string | null;
  groupId?: number | null;
  numOfFP: number;
  numOfFace: number;
  numOfCard: number;
  createdAt: string;
  updatedAt: string;
  device?: {
    name: string;
    model: string;
  };
}

export interface AttendanceEventData {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  employeeNo: string;
  employeeName: string;
  eventTime: string;
  dateFormatted: string;
  timeFormatted: string;
  deviceTimeFormatted?: string;
  deviceDateFormatted?: string;
  timezoneOffset?: string;
  localTimeFormatted?: string;
  major: number;
  minor: number;
  status?: 'SUCCESS' | 'FAILED';
  statusLabel?: string;
  eventCategory: string;
  eventDescription: string;
  verificationMode: string;
  verificationModeLabel: string;
  doorNo?: number | null;
  cardReaderNo?: number | null;
  serialNo?: number | null;
  hasRawPayload: boolean;
  rawEvent?: unknown;
}

export interface DashboardSummaryData {
  device: {
    id: string;
    name: string;
    model: string;
    firmware: string;
    serialNo: string;
    host: string;
    lastSeenAt?: string | null;
    lastSyncAt?: string | null;
  };
  stats: {
    totalUsers: number;
    fingerprintUsers: number;
    faceUsers: number;
    cardUsers: number;
    totalEvents: number;
    todayEvents: number;
  };
  recentEvents: Array<{
    id: string;
    employeeNo: string;
    employeeName: string;
    eventTime: string;
    timeFormatted?: string;
    eventDescription: string;
    verificationModeLabel: string;
    doorNo?: number | null;
  }>;
  serverTime: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
