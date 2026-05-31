export type ReviewRewardType = 'points' | 'coupon';

export interface EligibleReviewItem {
    orderId: number;
    orderNumber: string;
    orderStatus: string;
    orderItemId: number;
    productId: number;
    productName: string;
    productSlug: string | null;
    productImageUrl: string | null;
    quantity: number;
    unitPrice: number;
    placedAt: string | null;
}

export interface ReviewReward {
    type: ReviewRewardType;
    points?: number;
    coupon?: {
        id: number;
        code: string;
        discountType: string;
        discountValue: number;
        minOrderAmount: number;
        expiresAt: string;
    };
}

export interface CreateReviewPayload {
    orderItemId: number;
    rating: number;
    title?: string;
    comment?: string;
    rewardType: ReviewRewardType;
}

export interface CreateReviewResponse {
    review: {
        id: number;
        productId: number;
        rating: number;
        title: string | null;
        comment: string | null;
        rewardType: ReviewRewardType | null;
        rewardPayload: Record<string, unknown> | null;
    };
    reward: ReviewReward;
    loyaltyPoints: number;
}

export interface UserCoupon {
    id: number;
    code: string;
    source: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
    expiresAt: string;
    isUsed: boolean;
}

export interface PointsSummary {
    balance: number;
    transactions: Array<{
        id: number;
        amount: number;
        balanceAfter: number;
        type: string;
        note: string | null;
        createdAt: string;
    }>;
}

export interface ProductReviewPublic {
    id: number;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: string;
    user: {
        id: number;
        fullName: string | null;
        username: string;
        avatarUrl?: string | null;
    } | null;
}
