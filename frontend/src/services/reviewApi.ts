import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type {
    CreateReviewPayload,
    CreateReviewResponse,
    EligibleReviewItem,
    PointsSummary,
    ProductReviewPublic,
    UserCoupon
} from '../types/review';

export async function fetchEligibleReviewItems(): Promise<EligibleReviewItem[]> {
    const res = await axiosInstance.get<ApiEnvelope<{ items: EligibleReviewItem[] }>>(
        '/reviews/eligible'
    );
    return res.data.items ?? [];
}

export async function createProductReview(
    payload: CreateReviewPayload
): Promise<CreateReviewResponse> {
    const res = await axiosInstance.post<ApiEnvelope<CreateReviewResponse>>('/reviews', payload);
    return res.data;
}

export async function fetchProductReviews(
    productId: number,
    page = 1
): Promise<{ reviews: ProductReviewPublic[]; pagination: { total: number; totalPages: number } }> {
    const res = await axiosInstance.get<
        ApiEnvelope<{
            reviews: ProductReviewPublic[];
            pagination: { total: number; totalPages: number };
        }>
    >(`/reviews/products/${productId}`, { params: { page, limit: 10 } });
    return {
        reviews: res.data.reviews ?? [],
        pagination: res.data.pagination ?? { total: 0, totalPages: 0 }
    };
}

export async function fetchMyCoupons(): Promise<UserCoupon[]> {
    const res = await axiosInstance.get<ApiEnvelope<{ coupons: UserCoupon[] }>>('/users/me/coupons');
    return res.data.coupons ?? [];
}

export async function fetchMyPoints(): Promise<PointsSummary> {
    const res = await axiosInstance.get<ApiEnvelope<PointsSummary>>('/users/me/points');
    return res.data;
}
