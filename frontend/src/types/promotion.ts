export interface ShopPromotion {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    scope: 'shop' | 'category' | 'product';
    type: 'percentage' | 'fixed_amount' | 'free_shipping';
    value: number;
    minOrderAmount: number;
    categoryIds?: number[];
    productIds?: number[];
    categories?: Array<{ id: number; name: string }>;
    products?: Array<{ id: number; name: string }>;
    maxUsesPerUser?: number;
    usageLimit?: number;
    usedCount?: number;
}

export interface PromotionValidateResult {
    valid: boolean;
    message?: string;
    code?: string;
    promotion?: ShopPromotion;
    promotionDiscount?: number;
    freeShipping?: boolean;
    eligibleSubtotal?: number;
}
