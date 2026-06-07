import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { AdminDashboardData } from '../types/adminDashboard';

export interface AdminDashboardQuery {
    from?: string;
    to?: string;
    preset?: '7d' | '30d' | '90d' | '365d';
    groupBy?: 'day' | 'month';
    status?: string;
}

export async function fetchAdminDashboard(query: AdminDashboardQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminDashboardData>>('/admin/dashboard', {
        params: query
    });
    return response.data;
}
