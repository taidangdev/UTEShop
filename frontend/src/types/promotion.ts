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
