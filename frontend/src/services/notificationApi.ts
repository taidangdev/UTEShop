import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { GetNotificationsResponse, AppNotification } from '../types/notification';

export async function fetchNotificationsApi(limit = 20, offset = 0): Promise<GetNotificationsResponse> {
    const res = await axiosInstance.get<ApiEnvelope<GetNotificationsResponse>>(
        `/notifications?limit=${limit}&offset=${offset}`
    );
    // @ts-ignore
    return res.data;
}

export async function markAsReadApi(id: number): Promise<{ notification: AppNotification }> {
    const res = await axiosInstance.put<ApiEnvelope<{ notification: AppNotification }>>(`/notifications/${id}/read`);
    // @ts-ignore
    return res.data;
}

export async function markAllAsReadApi(): Promise<{ success: boolean }> {
    const res = await axiosInstance.put<ApiEnvelope<{ success: boolean }>>('/notifications/read-all');
    // @ts-ignore
    return res.data;
}

export async function mockPostNotificationApi(title: string, content: string): Promise<{ notification: AppNotification }> {
    const res = await axiosInstance.post<ApiEnvelope<{ notification: AppNotification }>>('/notifications/mock-post', {
        title,
        content
    });
    // @ts-ignore
    return res.data;
}

export async function mockEventNotificationApi(title: string, content: string): Promise<{ notification: AppNotification }> {
    const res = await axiosInstance.post<ApiEnvelope<{ notification: AppNotification }>>('/notifications/mock-event', {
        title,
        content
    });
    // @ts-ignore
    return res.data;
}
