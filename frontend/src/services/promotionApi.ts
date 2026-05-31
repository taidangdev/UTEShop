import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { PromotionValidateResult, ShopPromotion } from '../types/promotion';

export async function fetchActivePromotions(): Promise<ShopPromotion[]> {
    const res = await axiosInstance.get<ApiEnvelope<{ promotions: ShopPromotion[] }>>(
        '/promotions/active'
    );
    return res.data.promotions ?? [];
}

export async function validatePromotionCode(
    code: string,
    productIds: number[]
): Promise<PromotionValidateResult> {
    const res = await axiosInstance.post<ApiEnvelope<PromotionValidateResult>>(
        '/promotions/validate',
        { code, productIds }
    );
    return res.data;
}
