import { apiClient } from './client';
import { ApiResponse, DashboardSummaryData } from '../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummaryData> => {
    const res = await apiClient.get<ApiResponse<DashboardSummaryData>>('/dashboard/summary');
    return res.data.data;
  },
};
