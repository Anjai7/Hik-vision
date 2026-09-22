import { apiClient } from './client';
import { ApiResponse, UserData } from '../types';

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  hasFP?: boolean;
  hasFace?: boolean;
  hasCard?: boolean;
}

export const usersApi = {
  getUsers: async (params?: GetUsersParams) => {
    const res = await apiClient.get<ApiResponse<UserData[]>>('/users', { params });
    return {
      users: res.data.data,
      pagination: res.data.pagination,
    };
  },

  getUserByEmployeeNo: async (employeeNo: string): Promise<UserData> => {
    const res = await apiClient.get<ApiResponse<UserData>>(`/users/${employeeNo}`);
    return res.data.data;
  },

  syncUsers: async (): Promise<{ count: number; durationMs: number }> => {
    const res = await apiClient.post<ApiResponse<{ count: number; durationMs: number }>>('/users/sync');
    return res.data.data;
  },
};
