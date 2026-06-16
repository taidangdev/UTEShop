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

export interface AdminCategory {
    id: number;
    parentId: number | null;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    productCount: number;
    childCount: number;
}

export interface SaveCategoryPayload {
    name: string;
    parentId?: number | null;
    slug?: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}

export async function fetchAdminDashboard(query: AdminDashboardQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminDashboardData>>('/admin/dashboard', {
        params: query
    });
    return response.data;
}

export async function fetchAdminCategories() {
    const response = await axiosInstance.get<ApiEnvelope<{ categories: AdminCategory[] }>>('/admin/categories');
    return response.data;
}

export async function createAdminCategory(payload: SaveCategoryPayload) {
    const response = await axiosInstance.post<ApiEnvelope<{ category: AdminCategory }>>('/admin/categories', payload);
    return response.data;
}

export async function updateAdminCategory(id: number, payload: SaveCategoryPayload) {
    const response = await axiosInstance.put<ApiEnvelope<{ category: AdminCategory }>>(`/admin/categories/${id}`, payload);
    return response.data;
}

export async function deleteAdminCategory(id: number) {
    const response = await axiosInstance.delete<ApiEnvelope<void>>(`/admin/categories/${id}`);
    return response.data;
}

export async function bulkActiveAdminCategories(ids: number[], isActive: boolean) {
    const response = await axiosInstance.post<ApiEnvelope<void>>('/admin/categories/bulk-active', {
        ids,
        isActive
    });
    return response.data;
}

export async function bulkDeleteAdminCategories(ids: number[]) {
    const response = await axiosInstance.post<ApiEnvelope<{ deletedCount: number; failedNames: string[] }>>('/admin/categories/bulk-delete', {
        ids
    });
    return response.data;
}
