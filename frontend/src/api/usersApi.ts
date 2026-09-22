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

export interface CreateUserPayload {
  employeeNo: string;
  name: string;
  userType?: string;
  enabled?: boolean;
  gender?: string | null;
  groupId?: number | null;
  numOfCard?: number;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface UpdateUserPayload {
  name?: string;
  userType?: string;
  enabled?: boolean;
  gender?: string | null;
  groupId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
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

  createUser: async (payload: CreateUserPayload): Promise<UserData> => {
    const res = await apiClient.post<ApiResponse<UserData>>('/users', payload);
    return res.data.data;
  },

  updateUser: async (employeeNo: string, payload: UpdateUserPayload): Promise<UserData> => {
    const res = await apiClient.put<ApiResponse<UserData>>(`/users/${employeeNo}`, payload);
    return res.data.data;
  },

  deleteUser: async (employeeNo: string): Promise<{ success: boolean; deletedEmployeeNo: string }> => {
    const res = await apiClient.delete<ApiResponse<{ success: boolean; deletedEmployeeNo: string }>>(`/users/${employeeNo}`);
    return res.data.data;
  },

  toggleStatus: async (employeeNo: string, enabled: boolean): Promise<UserData> => {
    const res = await apiClient.patch<ApiResponse<UserData>>(`/users/${employeeNo}/status`, { enabled });
    return res.data.data;
  },

  expireUser: async (employeeNo: string): Promise<UserData> => {
    const res = await apiClient.post<ApiResponse<UserData>>(`/users/${employeeNo}/expire`);
    return res.data.data;
  },

  grantAccess: async (employeeNo: string, years = 1): Promise<UserData> => {
    const res = await apiClient.post<ApiResponse<UserData>>(`/users/${employeeNo}/grant`, { years });
    return res.data.data;
  },

  syncUsers: async (): Promise<{ count: number; durationMs: number }> => {
    const res = await apiClient.post<ApiResponse<{ count: number; durationMs: number }>>('/users/sync');
    return res.data.data;
  },
};
