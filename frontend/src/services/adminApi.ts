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

export async function fetchAdminDashboard(query: AdminDashboardQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminDashboardData>>('/admin/dashboard', {
        params: query
    });
    return response.data;
}

export async function fetchAdminOrders(query: AdminOrdersQuery = {}) {
    const response = await axiosInstance.get<ApiEnvelope<AdminOrdersListData>>('/admin/orders', {
        params: query
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
