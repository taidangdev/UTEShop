import type { ProductMajor } from './catalog';
import type { PaginationMeta } from './api';

export interface ProfileUser {
    id: number;
    username: string;
    email: string;
    fullName?: string | null;
    phone?: string | null;
    address?: string | null;
    role?: string;
    status?: string;
    studentId?: string | null;
    majorId?: number | null;
    avatarUrl?: string | null;
    emailVerifiedAt?: string | null;
    major?: ProductMajor | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProfileStats {
    orderCount: number;
    reviewCount: number;
    loyaltyPoints?: number;
}

export interface ProfileMeResponse {
    user: ProfileUser;
    stats: ProfileStats;
}

export interface ProfileOrder {
    id: number;
    orderNumber: string;
    status: string;
    statusLabel: string;
    statusClass: string;
    title: string;
    detail: string;
    price: string;
    priceClass: string;
    image: string;
    action: string;
    actionClass: string;
    progress: number;
    placedAt: string | null;
    itemCount: number;
    productSlug?: string | null;
    productId?: number | null;
    total: number;
    payment: { method: string; status: string } | null;
}

export interface ProfileReview {
    id: number;
    productId: number;
    productName: string;
    productSlug: string | null;
    productImageUrl: string;
    rating: number;
    title?: string | null;
    comment: string | null;
    status: string;
    rewardType?: string | null;
    rewardPayload?: Record<string, unknown> | null;
    createdAt: string;
}

export interface ProfileUpdatePayload {
    fullName?: string;
    phone?: string;
    address?: string;
    otp?: string;
}

export interface ProfileState {
    user: ProfileUser | null;
    stats: ProfileStats | null;
    orders: ProfileOrder[];
    reviews: ProfileReview[];
    ordersLoading: boolean;
    reviewsLoading: boolean;
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;
    ordersError: string | null;
    reviewsError: string | null;
    updateSuccess: boolean;
}
