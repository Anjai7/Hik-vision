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

export const attendanceApi = {
  getAttendance: async (params?: GetAttendanceParams) => {
    const res = await apiClient.get<ApiResponse<AttendanceEventData[]>>('/attendance', { params });
    return {
      events: res.data.data,
      pagination: res.data.pagination,
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
