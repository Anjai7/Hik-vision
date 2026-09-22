import { apiClient } from './client';
import { ApiResponse, AttendanceEventData } from '../types';

export interface GetAttendanceParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  employeeNo?: string;
  search?: string;
  verificationMode?: string;
  major?: number;
  minor?: number;
}

export interface DailySummaryRecord {
  date: string;
  employeeNo: string;
  employeeName: string;
  firstInTime: string;
  firstInFormatted: string;
  lastOutTime: string;
  lastOutFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  punchesCount: number;
  status: 'IN_OFFICE' | 'COMPLETED' | 'SINGLE_PUNCH';
  statusLabel: string;
  verificationMode: string;
  punches: Array<{
    time: string;
    formattedTime: string;
    mode: string;
  }>;
}

export interface DailySummaryStats {
  totalEmployeesPresent: number;
  currentlyInOffice: number;
  completedShifts: number;
  avgDurationMinutes: number;
}

export const attendanceApi = {
  getAttendance: async (params?: GetAttendanceParams) => {
    const res = await apiClient.get<ApiResponse<AttendanceEventData[]>>('/attendance', { params });
    return {
      events: res.data.data,
      pagination: res.data.pagination,
    };
  },

  getDailySummary: async (params?: { from?: string; to?: string; employeeNo?: string; search?: string }) => {
    const res = await apiClient.get<ApiResponse<DailySummaryRecord[]> & { stats: DailySummaryStats }>('/attendance/summary', { params });
    return {
      summary: res.data.data,
      stats: res.data.stats,
    };
  },

  getAttendanceById: async (id: string): Promise<AttendanceEventData> => {
    const res = await apiClient.get<ApiResponse<AttendanceEventData>>(`/attendance/${id}`);
    return res.data.data;
  },

  syncAttendance: async (options?: { startTime?: string; endTime?: string }): Promise<{ count: number; durationMs: number }> => {
    const res = await apiClient.post<ApiResponse<{ count: number; durationMs: number }>>('/attendance/sync', options);
    return res.data.data;
  },
};
