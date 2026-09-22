import { apiClient } from './client';
import { ApiResponse, DeviceData } from '../types';

export const deviceApi = {
  getDevice: async (): Promise<DeviceData> => {
    const res = await apiClient.get<ApiResponse<DeviceData>>('/device');
    return res.data.data;
  },

  getStatus: async (): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>('/device/status');
    return res.data.data;
  },

  testConnection: async (): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/device/test');
    return res.data.data;
  },

  syncAll: async (): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/device/sync');
    return res.data.data;
  },
};
