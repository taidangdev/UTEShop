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

export interface AdminPromotion {
    id: number;
    code: string;
    name: string;
    scope: 'shop' | 'category' | 'product';
    description: string | null;
    type: 'percentage' | 'fixed_amount' | 'free_shipping';
    value: number;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
    maxUsesPerUser: number | null;
    startsAt: string | null;
    endsAt: string | null;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
    categories?: Array<{ id: number; name: string; slug: string }>;
    products?: Array<{ id: number; name: string; slug: string }>;
}

export interface SavePromotionPayload {
    code?: string;
    name: string;
    scope: 'shop' | 'category' | 'product';
    description?: string | null;
    type: 'percentage' | 'fixed_amount' | 'free_shipping';
    value: number;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
    maxUsesPerUser?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    usageLimit?: number | null;
    isActive?: boolean;
    categoryIds?: number[];
    productIds?: number[];
}

export async function fetchAdminPromotions(page = 1, limit = 10) {
    const response = await axiosInstance.get<ApiEnvelope<{
        promotions: AdminPromotion[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>>('/admin/promotions', {
        params: { page, limit }
    });
    return response.data;
}

export async function createAdminPromotion(payload: SavePromotionPayload) {
    const response = await axiosInstance.post<ApiEnvelope<{ promotion: AdminPromotion }>>('/admin/promotions', payload);
    return response.data;
}

export async function updateAdminPromotion(id: number, payload: SavePromotionPayload) {
    const response = await axiosInstance.put<ApiEnvelope<{ promotion: AdminPromotion }>>(`/admin/promotions/${id}`, payload);
    return response.data;
}

export async function deleteAdminPromotion(id: number) {
    const response = await axiosInstance.delete<ApiEnvelope<void>>(`/admin/promotions/${id}`);
    return response.data;
}

export async function bulkActiveAdminPromotions(ids: number[], isActive: boolean) {
    const response = await axiosInstance.post<ApiEnvelope<void>>('/admin/promotions/bulk-active', {
        ids,
        isActive
    });
    return response.data;
}

export async function bulkDeleteAdminPromotions(ids: number[]) {
    const response = await axiosInstance.post<ApiEnvelope<{ deletedCount: number; failedCodes: string[] }>>('/admin/promotions/bulk-delete', {
        ids
    });
    return response.data;
}
