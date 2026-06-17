import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { AdminDashboardData } from '../types/adminDashboard';
import type {
    AdminOrderDetail,
    AdminOrdersListData,
    AdminOrdersQuery,
    UpdateAdminOrderStatusPayload
} from '../types/adminOrders';
import type {
    AdminProductDetail,
    AdminProductFormOptions,
    AdminProductPayload,
    AdminProductsListData,
    AdminProductsQuery
} from '../types/adminProducts';

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

export async function fetchAdminOrders(query: AdminOrdersQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminOrdersListData>>('/admin/orders', {
        params: query
    });
    return response.data;
}

export async function bulkDeleteAdminCategories(ids: number[]) {
    const response = await axiosInstance.post<ApiEnvelope<{ deletedCount: number; failedNames: string[] }>>('/admin/categories/bulk-delete', {
        ids
    });
    return response.data;
}

export async function fetchAdminOrderDetail(orderNumber: string) {
    const response = await axiosInstance.get<ApiEnvelope<{ order: AdminOrderDetail }>>(
        `/admin/orders/${orderNumber}`
    );
    return response.data;
}

export async function updateAdminOrderStatus(
    orderNumber: string,
    payload: UpdateAdminOrderStatusPayload
) {
    const response = await axiosInstance.patch<ApiEnvelope<{ order: AdminOrderDetail }>>(
        `/admin/orders/${orderNumber}/status`,
        payload
    );
    return response.data;
}

export async function fetchAdminProducts(query: AdminProductsQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminProductsListData>>('/admin/products', {
        params: query
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

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    address: string | null;
    role: 'admin' | 'customer' | 'user';
    status: 'active' | 'inactive' | 'banned';
    studentId: string | null;
    loyaltyPoints: number;
    createdAt: string;
    orderCount?: number;
    major?: {
        id: number;
        code: string;
        name: string;
    } | null;
}

export interface AdminUserDetail {
    user: AdminUser & {
        addresses: Array<{
            id: number;
            userId: number;
            receiverName: string;
            receiverPhone: string;
            region: string;
            district: string;
            ward: string;
            detailAddress: string;
            isDefault: boolean;
        }>;
    };
    orders: Array<{
        id: number;
        orderNumber: string;
        placedAt: string;
        status: string;
        total: number;
    }>;
}

export async function fetchAdminUsers(page = 1, limit = 10, q = '', status = '', role = '') {
    const response = await axiosInstance.get<ApiEnvelope<{
        users: AdminUser[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>>('/admin/users', {
        params: { page, limit, q: q || undefined, status: status || undefined, role: role || undefined }
    });
    return response.data;
}

export async function fetchAdminProductFormOptions() {
    const response = await axiosInstance.get<ApiEnvelope<AdminProductFormOptions>>(
        '/admin/products/form-options'
    );
    return response.data;
}

export async function fetchAdminProductDetail(id: number) {
    const response = await axiosInstance.get<ApiEnvelope<{ product: AdminProductDetail }>>(
        `/admin/products/${id}`
    );
    return response.data;
}

export async function createAdminProduct(payload: AdminProductPayload) {
    const response = await axiosInstance.post<ApiEnvelope<{ product: AdminProductDetail }>>(
        '/admin/products',
        payload
    );
    return response.data;
}

export async function updateAdminProduct(id: number, payload: Partial<AdminProductPayload>) {
    const response = await axiosInstance.patch<ApiEnvelope<{ product: AdminProductDetail }>>(
        `/admin/products/${id}`,
        payload
    );
    return response.data;
}

export async function deleteAdminProduct(id: number) {
    const response = await axiosInstance.delete<
        ApiEnvelope<{ product: { id: number; status: string; statusLabel: string } }>
    >(`/admin/products/${id}`);
    return response.data;
}

// --- Consignment Management ---
import type { Consignment } from '../types/consignment';

export interface AdminConsignmentsQuery {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export interface AdminConsignmentListData {
    consignments: Consignment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UpdateAdminConsignmentPayload {
    status?: string;
    approvedPrice?: number;
    adminNote?: string;
    productId?: number;
}

export async function fetchAdminConsignments(query: AdminConsignmentsQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminConsignmentListData>>('/admin/consignments', {
        params: query
    });
    return response.data;
}

export async function fetchAdminUserDetail(id: number) {
    const response = await axiosInstance.get<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}`);
    return response.data;
}

export async function updateAdminUserStatus(id: number, status: 'active' | 'inactive' | 'banned') {
    const response = await axiosInstance.put<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}/status`, { status });
    return response.data;
}

export async function updateAdminUserRole(id: number, role: 'admin' | 'customer' | 'user') {
    const response = await axiosInstance.put<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}/role`, { role });
    return response.data;
}

export async function bulkUpdateAdminUserStatus(ids: number[], status: 'active' | 'inactive' | 'banned') {
    const response = await axiosInstance.post<ApiEnvelope<{ updatedCount: number; failedNames: string[] }>>('/admin/users/bulk-status', {
        ids,
        status
    });
    return response.data;
}

export async function updateAdminConsignment(id: number, payload: UpdateAdminConsignmentPayload) {
    const response = await axiosInstance.patch<ApiEnvelope<Consignment>>(`/admin/consignments/${id}`, payload);
    return response.data;
}

export async function deleteAdminConsignment(id: number) {
    const response = await axiosInstance.delete<ApiEnvelope<{ message: string }>>(`/admin/consignments/${id}`);
    return response.data;
}
