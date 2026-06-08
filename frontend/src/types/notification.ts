export interface AppNotification {
    id: number;
    userId: number | null;
    title: string;
    content: string;
    type: 'order_new' | 'review_new' | 'post_new' | 'event_new' | 'order_status_update';
    relatedId: string | null;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GetNotificationsResponse {
    count: number;
    rows: AppNotification[];
}
